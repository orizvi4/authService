import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { resolve } from 'path';
import { Constants } from 'src/common/constants.class';
import { UserDTO } from 'src/common/models/user.dto';
import { AuthTokenService } from 'src/common/services/AuthToken.service';
import { LoggerService } from 'src/common/services/logger.service';

const ActiveDirectory = require('activedirectory');
const ldap = require('ldapjs');


@Injectable()
export class ActiveDirectoryService {
    constructor(private loggerService: LoggerService, private authTokenService: AuthTokenService) {
        this.createLDAPClient();
    }
    config = {
        url: `ldap://${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
        baseDN: `dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`,
        username: `${Constants.ADMIN_USER}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
        password: Constants.ADMIN_PASWORD
    };
    activeDirectory = new ActiveDirectory(this.config);
    groups: string[] = ['commanders', 'managers'];
    client;


    async refreshToken(username: string) {
        const payload = { username: username, group: await this.getUserGroup(username) };
        return await this.authTokenService.sign(payload, Constants.ACCESS_TOKEN_EXPIRE);
    }

    async addToBlackList(accessToken: string, refreshToken: string) {
        this.authTokenService.addToBlackList(accessToken);
        this.authTokenService.addToBlackList(refreshToken);
    }

    async createLDAPClient(reconnect: boolean = false) {
        this.client = await ldap.createClient({
            url: `ldaps://${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}:636`,
            tlsOptions: {
                rejectUnauthorized: false
            }
        });
        this.client.on('error', async (err) => {
            if (!reconnect) {
                this.loggerService.logError(err.message, 'ldapjs');
            }
            await new Promise((resolve) => { setTimeout(resolve, 2500) });
            this.createLDAPClient(true);
        });
    }

    async getUsers(): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
            this.activeDirectory.findUsers((err, users) => {
                if (err) {
                    this.loggerService.logError(err.message, 'active directory');
                    reject(new InternalServerErrorException());
                }
                else {
                    resolve(JSON.stringify(users.slice(3)));
                }
            });
        });
    }

    async authenticate(body: UserDTO): Promise<UserDTO | string | any> {
        let username: string = `${body.username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`;
        let password: string = body.password;

        try {
            await new Promise((resolve, reject) => {
                this.activeDirectory.authenticate(username, password, (err, auth) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(auth);
                });
            });

            this.loggerService.logInfo('user: ' + username + ' authanticated successfully');
            let user: UserDTO = await new Promise((resolve, reject) => {
                this.activeDirectory.findUser(username, (err, user) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(user);
                });
            });
            const group = await this.getUserGroup(body.username);
            const payload = { username: user.username, group: group };
            const accessToken = await this.authTokenService.sign(payload, Constants.ACCESS_TOKEN_EXPIRE);
            const refreshToken = await this.authTokenService.sign(payload, Constants.REFRESH_TOKEN_EXPIRE);
            return { ...user, group: group, accessToken: accessToken, refreshToken: refreshToken }
        }
        catch (err) {
            this.loggerService.logError(err.message, 'active directory');
            if (err.errno == -3008) {
                throw new InternalServerErrorException();
            }
            throw new UnauthorizedException();
        }
    }
    async getUserGroup(username: string): Promise<string> {
        for (const group of this.groups) {
            try {
                const res: boolean = await this.memberOf(username, group);
                if (res == true) {
                    return group;
                }
            }
            catch (err) {
                throw err;
            }
        }
        return 'users';
    }

    private async memberOf(username: string, group: string): Promise<boolean> {
        let user = `${username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`;
        let groupName = `${group}`;
        try {
            const res: boolean = await new Promise((resolve, reject) => {
                this.activeDirectory.isUserMemberOf(user, groupName, (err, isMember) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(isMember);
                });
            });
            return res;

        }
        catch (err) {
            this.loggerService.logError(err.message, 'active directory');
            throw new InternalServerErrorException();
        }
    }

    async clientBind() {
        const bind = await new Promise(async (resolve, reject) => {
            await this.client.bind(`cn=${Constants.ADMIN_USER},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, Constants.ADMIN_PASWORD, (err) => {
                if (err) {
                    this.loggerService.logError(err.message, 'ldapjs');
                    reject("error");
                }
                else {
                    this.loggerService.logInfo(`client: cn=${Constants.ADMIN_USER},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END} binded`);
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
            const currentDN = `cn=${oldUser.username},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`;
            const newDN = `cn=${newUser.username},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`;
            const change = {
                operation: 'replace',
                modification: {
                    userPrincipalName: `${newUser.username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
                    sAMAccountName: newUser.username,
                    givenName: newUser.username,
                    sn: newUser.sn,
                    displayName: `${newUser.username} ${newUser.sn}`,
                }
            };
            if (newUser.username != oldUser.username) {
                await new Promise((resolve, reject) => {
                    this.client.modifyDN(currentDN, newDN, (err) => {
                        if (err) {
                            return reject(err);
                        }
                    });
                    resolve('success');
                });
            }
            await new Promise((resolve, reject) => {
                this.client.modify(currentDN, change, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve('success');
                });
            });
            await this.updateGroupOfUser(newUser.username, newUser.group);
            return JSON.stringify({
                userPrincipalName: `${newUser.username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
                givenName: newUser.username,
                sn: newUser.sn,
                isEdit: false,
                group: newUser.group,
            });
        }
        catch (err) {
            if (err == 'error') {
                throw new InternalServerErrorException();
            }
            else {
                this.loggerService.logError(err.message, 'ldapjs');
                throw new BadRequestException();
            }
        }
    }

    async createUser(body: UserDTO): Promise<string> {
        let user: UserDTO;
        try {
            user = await new Promise((resolve, reject) => {
                this.activeDirectory.findUser(body.username, (err, user) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(user);
                });
            });
        }
        catch (err) {
            this.loggerService.logError(err.message, 'active directory');
            throw new InternalServerErrorException();
        }
        try {
            if (!user) {
                const utf16Buffer = Buffer.from('"Turhmch123"', 'utf16le');
                await this.clientBind();
                const entry = {
                    userPrincipalName: `${body.username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
                    sAMAccountName: body.username,
                    givenName: body.username,
                    sn: body.sn,
                    displayName: `${body.username} ${body.sn}`,
                    objectClass: 'user',
                    userAccountControl: 512,
                    unicodePwd: utf16Buffer
                };
                const res = await new Promise(async (resolve, reject) => {
                    await this.client.add(`cn=${body.username},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, entry, (err) => {
                        if (err) {
                            return reject(err);
                        }
                    });
                    this.loggerService.logInfo('user: ' + body.username + ' has been created');
                    resolve("success");
                });
                if (res == "success") {
                    if (body.group != 'users') {
                        await this.addToGroup(body.username, body.group);
                    }
                    const now: string[] = ((new Date()).toLocaleDateString()).split('/');
                    return JSON.stringify({
                        userPrincipalName: `${body.username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
                        givenName: body.username,
                        sn: body.sn,
                        isEdit: false,
                        whenCreated: `${now[2]}${now[1]}${now[0]}`,
                        group: body.group
                    });
                }
            }
            else {
                throw new ForbiddenException();
            }
        }
        catch (err) {
            this.loggerService.logError(err.message, 'ldapjs');
            if (err.status == 403) {
                throw new ForbiddenException();
            }
            throw new InternalServerErrorException();
        }
    }

    async deleteUser(name: string): Promise<string> {
        try {
            await this.clientBind();
            return await new Promise(async (resolve, reject) => {
                await this.client.del(`cn=${name},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    this.loggerService.logInfo('user: ' + name + ' has been deleted');
                    resolve("success");
                });
            });
        }
        catch (err) {
            this.loggerService.logError(err.message, 'ldapjs');
            throw new InternalServerErrorException();
        }
    }

    private async addToGroup(name: string, group: string): Promise<string> {
        try {
            const change = {
                operation: 'add',
                modification: {
                    member: `cn=${name},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`
                }
            };
            if (group == 'managers') {
                await new Promise((resolve, reject) => {
                    this.client.modify(`cn=Domain Admins,cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, change, (err) => {
                        if (err) {
                            reject(err);
                        }
                        this.loggerService.logInfo('user: ' + name + ' has been added to administrators');
                        resolve("success");
                    });
                });
            }
            return await new Promise((resolve, reject) => {
                this.client.modify(`cn=${group},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, change, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    this.loggerService.logInfo('user: ' + name + ' has been added to group: ' + group);
                    resolve("success");
                });
            });
        }
        catch (err) {
            this.loggerService.logError(err.message, 'ldapjs');
            throw new InternalServerErrorException();
        }
    }

    private async updateGroupOfUser(name: string, newGroup: string) {
        try {
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
        catch (err: any) {
            throw err;
        }
    }

    private async deleteFromGroup(name: string, group: string): Promise<string> {
        try {
            await this.clientBind();
            const change = {
                operation: 'delete',
                modification: {
                    member: `cn=${name},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`
                }

            };
            if (group == 'managers') {
                await new Promise((resolve, reject) => {
                    this.client.modify(`cn=Domain Admins,cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, change, (err) => {
                        if (err) {
                            return reject(err);
                        }
                        this.loggerService.logInfo('user: ' + name + ' has been deleted from administrators');
                        resolve("success");
                    });
                });
            }

            return await new Promise((resolve, reject) => {
                this.client.modify(`cn=${group},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, change, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    this.loggerService.logInfo('user: ' + name + ' has been deleted from group: ' + group);
                    resolve("success");
                });
            });
        }
        catch (err) {
            this.loggerService.logError(err.message, 'ldapjs');
            throw new InternalServerErrorException();
        }
    }
}
