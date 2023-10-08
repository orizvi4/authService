import { Injectable } from '@nestjs/common';
import { promises } from 'dns';
import { findIndex } from 'rxjs';
import { UserDTO } from 'src/common/user.dto';

const ldap = require('ldapjs');
var ActiveDirectory = require('activedirectory');

const ADMIN_USER: string = "shaleb";
const ADMIN_PASWORD: string = "Turhmch123";
const DOMAIN_NAME: string = "orizvi";
const DOMAIN_END: string = "test";

let client = ldap.createClient({
    url: `ldap://${DOMAIN_NAME}.${DOMAIN_END}`,
    reconnect: true
});
client.on('error', (err) => {
    client = ldap.createClient({
        url: `ldap://${DOMAIN_NAME}.${DOMAIN_END}`,
        reconnect: true
    });
});

@Injectable()
export class ActiveDirectoryService {
    config = {
        url: `ldap://${DOMAIN_NAME}.${DOMAIN_END}`,
        baseDN: `dc=${DOMAIN_NAME},dc=${DOMAIN_END}`,
        username: `${ADMIN_USER}@${DOMAIN_NAME}.${DOMAIN_END}`,
        password: ADMIN_PASWORD
    };
    activeDirectory = new ActiveDirectory(this.config);
    groups: string[] = ['commanders', 'managers'];

    async getUsers(): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
            this.activeDirectory.findUsers((err, users) => {
                if (err) {
                    console.log(err);
                    reject("error");
                }
                else {
                    resolve(JSON.stringify(users.slice(3)));
                }
            });
        });
    }

    async authenticate(body: UserDTO): Promise<UserDTO> {
        let username: string = `${body.username}@${DOMAIN_NAME}.${DOMAIN_END}`;
        let password: string = body.password;

        try {
            await new Promise((resolve, reject) => {
                this.activeDirectory.authenticate(username, password, (err, auth) => {
                    if (err) {
                        console.log('ERROR: ' + JSON.stringify(err));
                        return reject('fail');
                    }
                    resolve(auth);
                });
            });
            console.log('Authenticated!');
            let user: UserDTO = await new Promise((resolve, reject) => {
                this.activeDirectory.findUser(username, (err, user) => {
                    if (err) {
                        console.log('ERROR: ' + JSON.stringify(err));
                        return reject('fail');
                    }
                    resolve(user);
                });
            });
            return {...user, group: await this.getUserGroup(body.username)}
        }
        catch (err) {
            console.error('Authentication failed');
            return err;
        }
    }
    async getUserGroup(username: string): Promise<string> {
        for (const group of this.groups) {
            const res: boolean | string = await this.memberOf(username, group);
            if (res == true) {
                return group;
            }
            else if (res == 'error') {
                return 'error';
            }
        }
        return 'users';
    }

    async memberOf(username: string, group: string): Promise<string | boolean> {
        let user = `${username}@${DOMAIN_NAME}.${DOMAIN_END}`;
        let groupName = `${group}`;
        try {
            const res = await new Promise((resolve, reject) => {
                this.activeDirectory.isUserMemberOf(user, groupName, (err, isMember) => {
                    if (err) {
                        console.log('ERROR: ' + JSON.stringify(err));
                        return reject(err);
                    }
                    resolve(isMember);
                });
            });
            if (res) {
                return true;
            }
            else {
                return false;
            }

        }
        catch (err) {
            console.log(err);
            return "error";
        }
    }

    async clientBind() {
        await client.bind(`cn=${ADMIN_USER},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, ADMIN_PASWORD, (err) => {
            if (err) {
                console.log("binding error " + err);
            }
            else {
                console.log("binded");
            }
        });
    }

    async modifyUser(body: UserDTO[]) {
        const oldUser: UserDTO = body[0];
        const newUser: UserDTO = body[1];
        try {
            await this.clientBind();
            const currentDN = `cn=${oldUser.username},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`;
            const newDN = `cn=${newUser.username},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`;
            const change = {
                operation: 'replace',
                modification: {
                    userPrincipalName: `${newUser.username}@${DOMAIN_NAME}.${DOMAIN_END}`,
                    sAMAccountName: newUser.username,
                    givenName: newUser.username,
                    sn: newUser.sn,
                    displayName: `${newUser.username} ${newUser.sn}`,
                }
            };
            client.modify(currentDN, change, (err) => {
                if (err) {
                    console.log(err);
                    return "error";
                }
            });
            if (newUser.username != oldUser.username) {
                client.modifyDN(currentDN, newDN, (err) => {
                    if (err) {
                        console.log(err);
                        return "error";
                    }
                });
            }

            await this.updateGroupOfUser(newUser.username, newUser.group);
            return JSON.stringify({
                userPrincipalName: `${newUser.username}@${DOMAIN_NAME}.${DOMAIN_END}`,
                givenName: newUser.username,
                sn: newUser.sn,
                isEdit: false,
                group: newUser.group,
            });
        }
        catch (err) {
            console.log(err);
        }
    }

    async createUser(body: UserDTO): Promise<string> {
        try {
            await this.clientBind();
            const entry = {
                userPrincipalName: `${body.username}@${DOMAIN_NAME}.${DOMAIN_END}`,
                sAMAccountName: body.username,
                givenName: body.username,
                sn: body.sn,
                displayName: `${body.username} ${body.sn}`,
                objectClass: 'user'

            };
            const res = await new Promise((resolve, reject) => {
                client.add(`cn=${body.username},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, entry, (addErr) => {
                    if (addErr) {
                        console.log("not created " + addErr);
                        return reject(addErr);
                    }
                });
                console.log('User created successfully');
                resolve("success");
            });
            if (res) {
                // await new Promise((resolve, reject) => {
                //     const change = {
                //         operation: 'replace',
                //         modification: {
                //             userAccountControl: 512
                //         }
                //     }
                //     client.modify(`cn=${body.username},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, change, (addErr) => {
                //         if (addErr) {
                //             console.log("not changed " + addErr);
                //             return reject("fail");
                //         }
                //         console.log('User changed successfully');
                //         resolve("success");
                //     });
                // });
                if (body.group != 'users') {
                    await this.addToGroup(body.username, body.group);
                }
                const now: string[] = ((new Date()).toLocaleDateString()).split('/');
                return JSON.stringify({
                    userPrincipalName: `${body.username}@${DOMAIN_NAME}.${DOMAIN_END}`,
                    givenName: body.username,
                    sn: body.sn,
                    isEdit: false,
                    whenCreated: `${now[2]}${now[1]}${now[0]}`,
                    group: body.group
                });
            }
            else {
                return "error"
            }
        }
        catch (error) {
            console.log('An error occurred:' + error);
            return "error";
        }
    }

    async deleteUser(name: string): Promise<string> {
        try {
            await this.clientBind();
            const res = await new Promise((resolve, reject) => {
                client.del(`cn=${name},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, (addErr) => {
                    if (addErr) {
                        console.log("not deleted " + addErr);
                        return reject("fail");
                    }
                    console.log('User deleted successfully');
                    resolve("success");
                });
            });
            if (res) {
                return "success";
            }
            else {
                return "error"
            }
        }
        catch (error) {
            console.log('An error occurred:' + error);
            return "error";
        }
    }

    async addToGroup(name: string, group: string): Promise<string> {
        try {
            const change = {
                operation: 'add',
                modification: {
                    member: `cn=${name},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`
                }
            };

            const res = await new Promise((resolve, reject) => {
                client.modify(`cn=${group},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, change, (addErr) => {
                    if (addErr) {
                        return reject(addErr);
                    }
                    console.log('group added successfully');
                    resolve("success");
                });
            });
            if (res) {
                return "success";
            }
            else {
                return "error";
            }
        }
        catch (error) {
            console.log('not added:' + error);
            return "error";
        }
    }

    async updateGroupOfUser(name: string, newGroup: string) {
        for (const group of this.groups) {
            if (newGroup != 'users') {
                if (group != newGroup && await this.memberOf(name, group)) {
                    await this.deleteFromGroup(name, group);
                }
                else if (group == newGroup && !(await this.memberOf(name, group))) {
                    await this.addToGroup(name, group);
                }
            }
            else {
                if (await this.memberOf(name, group)) {
                    await this.deleteFromGroup(name, group);
                }
            }
        }
    }

    async deleteFromGroup(name: string, group: string): Promise<string> {
        let client;
        try {
            client = await ldap.createClient({
                url: `ldap://${DOMAIN_NAME}.${DOMAIN_END}`
            });
            await client.bind(`cn=${ADMIN_USER},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, ADMIN_PASWORD, (err) => {
                if (err) {
                    console.log("binding error " + err);
                }
                else {
                    console.log("binded");
                }
            });
            const change = {
                operation: 'delete',
                modification: {
                    member: `cn=${name},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`
                }

            };

            const res = await new Promise((resolve, reject) => {
                client.modify(`cn=${group},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, change, (addErr) => {
                    if (addErr) {
                        return reject(addErr);
                    }
                    console.log('group deleted successfully');
                    resolve("success");
                });
            });
            if (res) {
                return "success";
            }
            else {
                return "error";
            }
        }
        catch (error) {
            console.log('not deleted:' + error);
            return "error";
        }
        finally {
            await client.unbind();
        }
    }
}
