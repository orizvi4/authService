import { Injectable } from '@nestjs/common';
import { UserDTO } from 'src/common/user.dto';

const ldap = require('ldapjs');
var ActiveDirectory = require('activedirectory');

const ADMIN_USER: string = "shaleb";
const ADMIN_PASWORD: string = "Turhmch123";
const DOMAIN_NAME: string = "orizvi";
const DOMAIN_END: string = "test";

@Injectable()
export class ActiveDirectoryService {
    config = {
        url: `ldap://${DOMAIN_NAME}.${DOMAIN_END}`,
        baseDN: `dc=${DOMAIN_NAME},dc=${DOMAIN_END}`,
        username: `${ADMIN_USER}@${DOMAIN_NAME}.${DOMAIN_END}`,
        password: ADMIN_PASWORD
    };
    activeDirectory = new ActiveDirectory(this.config);

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

    async authenticate(body: UserDTO): Promise<string> {
        let username: string = `${body.username}@${DOMAIN_NAME}.${DOMAIN_END}`;
        let password: string = body.password;

        try {
            const userExist = await new Promise((resolve, reject) => {
                this.activeDirectory.authenticate(username, password, (err, auth) => {
                    if (err) {
                        console.log('ERROR: ' + JSON.stringify(err));
                        return reject(err);
                    }
                    resolve(auth);
                });
            });

            if (userExist) {
                console.log('Authenticated!');
                return "success";
            } else {
                console.log('Authentication failed!');
                return "fail";
            }
        }
        catch (error) {
            console.error('An error occurred:', error);
            return "error";
        }
    }

    async memberOf(username: string, group: string): Promise<string> {
        let user = `${username}@${DOMAIN_NAME}.${DOMAIN_END}`;
        let groupName = group;
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
                return "success";
            }
            else {
                return "fail";
            }

        }
        catch (err) {
            console.log(err);
            return "error";
        }
    }

    async modifyUser(body: UserDTO[]) {
        const oldUser: UserDTO = body[0];
        const newUser: UserDTO = body[1];
        await this.deleteUser(oldUser.username);
        return await this.createUser(newUser);
    }

    async createUser(body: UserDTO): Promise<string> {
        const client = await ldap.createClient({
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
        const entry = {
            userPrincipalName: `${body.username}@${DOMAIN_NAME}.${DOMAIN_END}`,
            sAMAccountName: body.username,
            givenName: body.username,
            sn: body.sn,
            displayName: `${body.username} ${body.sn}`,
            objectClass: 'user'

        };
        try {
            const res = await new Promise((resolve, reject) => {
                client.add(`cn=${body.username},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, entry, (addErr) => {
                    if (addErr) {
                        console.log("not added " + addErr);
                        return reject(addErr);
                    }
                    console.log('User created successfully');
                    resolve("success");
                });
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

                const now: string[] = ((new Date()).toLocaleDateString()).split('/');
                return JSON.stringify({
                    userPrincipalName: `${body.username}@${DOMAIN_NAME}.${DOMAIN_END}`,
                    givenName: body.username,
                    sn: body.sn,
                    isEdit: false,
                    whenCreated: `${now[2]}${now[1]}${now[0]}`
                });;
            }
            else {
                return "fail"
            }
        }
        catch (error) {
            console.log('An error occurred:' + error);
            return "error";
        }
        finally {
            await client.unbind();
        }
    }

    async deleteUser(name: string): Promise<string> {
        const client = await ldap.createClient({
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
        try {
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
                return "fail"
            }
        }
        catch (error) {
            console.log('An error occurred:' + error);
            return "error";
        }
        finally {
            await client.unbind();
        }
    }

    async addToGroup(name: string, group: string): Promise<string> {
        const client = await ldap.createClient({
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
            operation: 'add',
            modification: {
                member: `cn=${name},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`
            }

        };
        try {
            const res = await new Promise((resolve, reject) => {
                client.modify(`cn=${group},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, change, (addErr) => {
                    if (addErr) {
                        console.log("not changed " + addErr);
                        return reject("fail");
                    }
                    console.log('User changed successfully');
                    resolve("success");
                });
            });
            if (res) {
                return "success";
            }
            else {
                return "fail"
            }
        }
        catch (error) {
            console.log('An error occurred:' + error);
            return "error";
        }
        finally {
            await client.unbind();
        }
    }

    async deleteFromGroup(name: string, group: string): Promise<string> {
        const client = await ldap.createClient({
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
        try {
            const res = await new Promise((resolve, reject) => {
                client.modify(`cn=${group},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, change, (addErr) => {
                    if (addErr) {
                        console.log("not changed " + addErr);
                        return reject("fail");
                    }
                    console.log('User changed successfully');
                    resolve("success");
                });
            });
            if (res) {
                return "success";
            }
            else {
                return "fail"
            }
        }
        catch (error) {
            console.log('An error occurred:' + error);
            return "error";
        }
        finally {
            await client.unbind();
        }
    }
}
