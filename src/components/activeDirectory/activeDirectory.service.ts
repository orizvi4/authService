import { Injectable } from '@nestjs/common';
import { resolve } from 'path';
import { UserDTO } from 'src/common/user.dto';

const ActiveDirectory = require('activedirectory');
const ldap = require('ldapjs');
const bunyan = require('bunyan');
const logstashStream = require('bunyan-logstash-tcp').createStream({
    host: '127.0.0.1',
    port: 5000
});
const logger = bunyan.createLogger({
    elasticIndex: 'auth-service',
    name: 'auth-service',
    category: 'code',
    streams: [{
        stream: logstashStream
    }],
});

const ADMIN_USER: string = "ori";
const ADMIN_PASWORD: string = "Turhmch123";
const DOMAIN_NAME: string = "orizvi";
const DOMAIN_END: string = "test";

@Injectable()
export class ActiveDirectoryService {
    constructor() {
        this.createLDAPClient();
    }
    config = {
        url: `ldap://${DOMAIN_NAME}.${DOMAIN_END}`,
        baseDN: `dc=${DOMAIN_NAME},dc=${DOMAIN_END}`,
        username: `${ADMIN_USER}@${DOMAIN_NAME}.${DOMAIN_END}`,
        password: ADMIN_PASWORD
    };
    activeDirectory = new ActiveDirectory(this.config);
    groups: string[] = ['commanders', 'managers'];
    client;


    async createLDAPClient() {
        this.client = await ldap.createClient({
            url: `ldaps://${DOMAIN_NAME}.${DOMAIN_END}:636`,
            tlsOptions: {
                rejectUnauthorized: false
            }
        });
        this.client.on('error', (err) => {
            logger.error({ category: 'ldapjs' }, err);
            this.createLDAPClient();
        });
    }

    async getUsers(): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
            this.activeDirectory.findUsers((err, users) => {
                if (err) {
                    logger.error({ category: 'active directory' }, err);
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
                        return reject(JSON.stringify(err));
                    }
                    resolve(auth);
                });
            });
            logger.info('user: ' + username + ' authanticated successfully');
            let user: UserDTO = await new Promise((resolve, reject) => {
                this.activeDirectory.findUser(username, (err, user) => {
                    if (err) {
                        return reject(JSON.stringify(err));
                    }
                    resolve(user);
                });
            });
            return { ...user, group: await this.getUserGroup(body.username) }
        }
        catch (err) {
            logger.error({ category: 'active directory' }, err);
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
                        return reject(JSON.stringify(err));
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
            logger.error({ category: 'active directory' }, err);
            return "error";
        }
    }

    async clientBind() {
        const bind = await new Promise(async (resolve, reject) => {
            await this.client.bind(`cn=${ADMIN_USER},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, ADMIN_PASWORD, (err) => {
                if (err) {
                    logger.error({ category: 'ldapjs' }, err);
                    reject("error");
                }
                else {
                    logger.info(`client: cn=${ADMIN_USER},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END} binded`);
                    resolve("binded");
                }
            });
        })
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
            await this.client.modify(currentDN, change, (err) => {
                if (err) {
                    logger.error({ category: 'ldapjs' }, err);
                    return "error";
                }
            });
            if (newUser.username != oldUser.username) {
                this.client.modifyDN(currentDN, newDN, (err) => {
                    if (err) {
                        logger.error({ category: 'ldapjs' }, err);
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
        let user: UserDTO;
        try {
            user = await new Promise((resolve, reject) => {
                this.activeDirectory.findUser(body.username, (err, user) => {
                    if (err) {
                        return reject(JSON.stringify(err));
                    }
                    resolve(user);
                });
            });
        }
        catch (err) {
            logger.error({category: 'active directory'}, err);
            return 'fail';
        }
        try {
            if (!user) {
                const utf16Buffer = Buffer.from('"Turhmch123"', 'utf16le');
                await this.clientBind();
                const entry = {
                    userPrincipalName: `${body.username}@${DOMAIN_NAME}.${DOMAIN_END}`,
                    sAMAccountName: body.username,
                    givenName: body.username,
                    sn: body.sn,
                    displayName: `${body.username} ${body.sn}`,
                    objectClass: 'user',
                    userAccountControl: 512,
                    unicodePwd: utf16Buffer
                };
                const res = await new Promise(async (resolve, reject) => {
                    await this.client.add(`cn=${body.username},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, entry, (err) => {
                        if (err) {
                            return reject(err);
                        }
                    });
                    logger.info('user: ' + body.username + ' has been created');
                    resolve("success");
                });
                if (res != "fail") {
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
                    return "fail";
                }
            }
            else {
                return 'fail';
            }
        }
        catch (err) {
            logger.error({category: 'ldapjs'}, err);
            return "error";
        }
    }

    async deleteUser(name: string): Promise<string> {
        try {
            await this.clientBind();
            const res = await new Promise(async (resolve, reject) => {
                await this.client.del(`cn=${name},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    logger.info('user: ' + name + ' has been deleted');
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
        catch (err) {
            logger.error({category: 'ldapjs'}, err);
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
            if (group == 'managers') {
                await new Promise((resolve, reject) => {
                    this.client.modify(`cn=Domain Admins,cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, change, (err) => {
                        if (err) {
                            reject(err);
                        }
                        logger.info('user: ' + name + ' has been added to administrators');
                        resolve("success");
                    });
                });
            }

            const res = await new Promise((resolve, reject) => {
                this.client.modify(`cn=${group},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, change, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    logger.info('user: ' + name + ' has been added to group: ' + group);
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
        catch (err) {
            logger.error({category: 'ldapjs'}, err);
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
        try {
            this.clientBind();
            const change = {
                operation: 'delete',
                modification: {
                    member: `cn=${name},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`
                }

            };
            if (group == 'managers') {
                await new Promise((resolve, reject) => {
                    this.client.modify(`cn=Domain Admins,cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, change, (err) => {
                        if (err) {
                            return reject(err);
                        }
                        logger.info('user: ' + name + ' has been deleted from administrators');
                        resolve("success");
                    });
                });
            }

            const res = await new Promise((resolve, reject) => {
                this.client.modify(`cn=${group},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, change, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    logger.info('user: ' + name + ' has been deleted from group: ' + group);
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
        catch (err) {
            logger.error({category: 'ldapjs'}, err);
            return "error";
        }
    }
}
