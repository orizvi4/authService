import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, UnauthorizedException, forwardRef } from '@nestjs/common';
import { Constants } from 'src/common/constants.class';
import { UserDTO } from 'src/components/activeDirectory/models/user.dto';
import { AuthTokenService } from 'src/common/services/AuthToken.service';
import { LoggerService } from 'src/common/services/logger.service';
import { StrikeService } from 'src/common/services/strike.service';
import { strike } from 'src/common/enums/strike.enums';
import { group } from 'src/common/enums/group.enums';

const ActiveDirectory = require('activedirectory');
const ldap = require('ldapjs');

@Injectable()
export class ActiveDirectoryService {
    constructor(
        private loggerService: LoggerService,
        @Inject(forwardRef(() => AuthTokenService)) private authTokenService: AuthTokenService,
        @Inject(forwardRef(() => StrikeService)) private strikeService: StrikeService) {
        this.createLDAPClient();
    }
    activeDirectory = new ActiveDirectory({
        url: `ldap://${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
        baseDN: `dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`,
        username: `${Constants.ADMIN_USER}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
        password: Constants.ADMIN_PASSWORD,
    });
    groups: group[] = [group.EDITORS, group.MANAGERS];
    client;


    async addToBlackList(accessToken: string, refreshToken: string) {
        this.authTokenService.addToBlackList(accessToken, "accessToken");
        this.authTokenService.addToBlackList(refreshToken, "refreshToken");
    }

    async createLDAPClient() {
        this.client = await ldap.createClient({
            url: `ldap://${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
            tlsOptions: {
                rejectUnauthorized: false
            },
            reconnect: true,
            idleTimeout: 3000
        });

        this.client.on('error', (err) => {
            console.log(err.message);
        });
    }

    public async getTokenUser(token: string): Promise<string> {//get the user by the token
        const username: string = this.authTokenService.decode(token).username;
        return await new Promise<string>((resolve, reject) => {
            this.activeDirectory.findUser({
                attributes: ['givenName', 'sn', 'mail', 'sAMAccountName', 'telephoneNumber']
            }, username, (err, user) => {
                if (err) {
                    LoggerService.logError(err.message, 'active directory');
                    reject(new InternalServerErrorException());
                }
                else {
                    resolve(JSON.stringify(user));
                }
            });
        });
    }

    async getUsers(username: string): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
            this.activeDirectory.findUsers({
                attributes: ['givenName', 'sn', 'mail', 'sAMAccountName', 'telephoneNumber']
            }, (err, users: Array<any>) => { // try active directory user
                if (err) {
                    LoggerService.logError(err.message, 'active directory');
                    reject(new InternalServerErrorException());
                }
                else {
                    users = users.filter(user => user.sAMAccountName !== 'krbtgt' && user.sAMAccountName !== 'Administrator' && user.sAMAccountName !== 'Guest' && user.sAMAccountName !== username);

                    resolve(JSON.stringify(users));
                }
            });
        });
    }

    async authenticate(body: UserDTO): Promise<UserDTO | string | any> {
        const username: string = `${body.username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`;
        const password: string = body.password;

        try {
            await new Promise((resolve, reject) => {
                this.activeDirectory.authenticate(username, password, (err, auth) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(auth);
                });
            });
            if (await this.strikeService.isBlocked(body.username)) {
                throw new UnauthorizedException();
            }

            LoggerService.logInfo('user: ' + body.username + ' authanticated successfully');
            await this.strikeService.resetLoginAttempt(body.username);

            let user: UserDTO = await new Promise((resolve, reject) => {
                this.activeDirectory.findUser(username, (err, user) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(user);
                });
            });
            const tempGroup = await this.getUserGroup(body.username);
            const payload = { username: body.username, group: tempGroup };
            const accessToken = await this.authTokenService.sign(payload, Constants.ACCESS_TOKEN_EXPIRE);
            const refreshToken = await this.authTokenService.sign(payload, Constants.REFRESH_TOKEN_EXPIRE);
            await this.authTokenService.setUserRefreshToken(body.username, refreshToken);
            return { ...user, group: tempGroup, accessToken: accessToken }
        }
        catch (err) {
            console.log(err);
            if (err.errno == -3008 || err.errno == -4039) {
                throw new InternalServerErrorException();
            }
            if (err.response != null && err.response.statusCode == 401) {
                throw new UnauthorizedException();
            }
            await this.strikeService.addLoginAttempt(body.username);
            LoggerService.logError("user: " + body.username + " failed attempt to log in", 'active directory');
            throw new BadRequestException();
        }
    }
    async getUserGroup(username: string): Promise<group> {
        for (const tempGroup of this.groups) {
            try {
                const res: boolean = await this.memberOf(username, tempGroup);
                if (res == true) {
                    return tempGroup;
                }
            }
            catch (err) {
                throw err;
            }
        }
        return group.USERS;
    }

    private async memberOf(username: string, tempGroup: group): Promise<boolean> {
        let user = `${username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`;
        try {
            const res: boolean = await new Promise((resolve, reject) => {
                this.activeDirectory.isUserMemberOf(user, tempGroup, (err, isMember) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(isMember);
                });
            });
            return res;

        }
        catch (err) {
            console.log(err);
            LoggerService.logError(err.message, 'active directory');
            throw new InternalServerErrorException();
        }
    }

    async clientBind() {
        await this.createLDAPClient();
        const bind = await new Promise(async (resolve, reject) => {
            await this.client.bind(`cn=${Constants.ADMIN_USER},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, Constants.ADMIN_PASSWORD, (err) => {
                if (err) {
                    LoggerService.logError(err.message, 'ldapjs');
                    reject("error");
                }
                else {
                    resolve("binded");
                }
            });
        })
    }

    public async limitUser(username: string): Promise<void> {
        await this.updateGroupOfUser(username, group.USERS);
    }

    public async blockUser(username: string): Promise<void> {
        const DN = `cn=${username},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`;
        try {
            await this.clientBind();

            const change = {
                operation: 'replace',
                modification: {
                    userAccountControl: 514,
                }
            };
            await new Promise((resolve, reject) => {
                this.client.modify(DN, change, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve('success');
                });
            });
        }
        catch (err) {
            console.log(err);
            LoggerService.logError(err.message, 'ldapjs');
            throw new BadRequestException();
        }
    }

    public async unblockUser(username: string): Promise<void> {
        const DN = `cn=${username},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`;
        try {
            await this.clientBind();

            const change = {
                operation: 'replace',
                modification: {
                    userAccountControl: 544,
                }
            };
            await new Promise((resolve, reject) => {
                this.client.modify(DN, change, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve('success');
                });
            });
        }
        catch (err) {
            console.log(err);
            LoggerService.logError(err.message, 'ldapjs');
            throw new BadRequestException();
        }
    }

    public async modifyUser(body: UserDTO[], clientUsername: string): Promise<string> {
        const oldUser: UserDTO = body[0];
        const newUser: UserDTO = body[1];
        try {
            await this.clientBind();
            const currentDN = `cn=${oldUser.username},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`;
            const newDN = `cn=${newUser.username},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`;

            if (Constants.INVALID_TEXT.test(newUser.username) || Constants.INVALID_TEXT.test(newUser.sn)) {
                throw new ForbiddenException();
            }

            const change = {
                operation: 'replace',
                modification: {
                    userPrincipalName: `${newUser.username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
                    sAMAccountName: newUser.username,
                    givenName: newUser.username,
                    sn: newUser.sn,
                    displayName: `${newUser.username} ${newUser.sn}`,
                    mail: newUser.mail,
                    telephoneNumber: newUser.telephoneNumber
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
                await this.strikeService.changeUsername(oldUser.username, newUser.username);
            }
            await new Promise((resolve, reject) => {
                this.client.modify(newDN, change, (err) => {
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
                mail: newUser.mail,
                telephoneNumber: newUser.telephoneNumber
            });
        }
        catch (err) {
            console.log(err);
            if (err == 'error') {
                throw new InternalServerErrorException();
            }
            else if (err.response != null && err.response.statusCode == 403) {
                await this.strikeService.strike(clientUsername, strike.INVALID_INPUT);
                throw err;
            }
            else {
                LoggerService.logError(err.message, 'ldapjs');
                throw new BadRequestException();
            }
        }
    }

    async createUser(body: UserDTO, clientUsername): Promise<string> {
        let user: UserDTO;
        try {
            if (Constants.INVALID_TEXT.test(body.username) || Constants.INVALID_TEXT.test(body.sn)) {
                throw new ForbiddenException();
            }
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
            LoggerService.logError(err.message, 'active directory');
            if (err.response != null && err.response.statusCode == 403) {
                await this.strikeService.strike(clientUsername, strike.INVALID_INPUT);
                throw err;
            }
            throw new InternalServerErrorException();
        }
        try {
            if (!user) {
                // const utf16Buffer = Buffer.from('"Turhmch123"', 'utf16le');
                await this.clientBind();
                const entry = {
                    userPrincipalName: `${body.username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
                    sAMAccountName: body.username,
                    givenName: body.username,
                    sn: body.sn,
                    displayName: `${body.username} ${body.sn}`,
                    mail: body.mail,
                    telephoneNumber: body.telephoneNumber,
                    objectClass: 'user',
                    userAccountControl: 544,
                    // unicodePwd: utf16Buffer
                };
                const res = await new Promise(async (resolve, reject) => {
                    await this.client.add(`cn=${body.username},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, entry, (err) => {
                        if (err) {
                            return reject(err);
                        }
                    });
                    LoggerService.logInfo('user: ' + body.username + ' has been created');
                    resolve("success");
                });

                if (res == "success") {
                    if (body.group != group.USERS) {
                        await this.addToGroup(body.username, body.group);
                    }
                    const now: string[] = ((new Date()).toLocaleDateString()).split('/');
                    await this.strikeService.createUser(body.username);
                    return JSON.stringify({
                        userPrincipalName: `${body.username}@${Constants.DOMAIN_NAME}.${Constants.DOMAIN_END}`,
                        givenName: body.username,
                        sn: body.sn,
                        isEdit: false,
                        group: body.group,
                        mail: body.mail,
                        telephoneNumber: body.telephoneNumber,
                    });
                }
            }
            else {
                throw new BadRequestException();
            }
        }
        catch (err) {
            LoggerService.logError(err.message, 'ldapjs');
            console.log(err);
            if (err.status == 400) {
                throw new BadRequestException();
            }
            throw new InternalServerErrorException();
        }
    }

    async deleteUser(name: string): Promise<string> {
        try {
            await this.clientBind();
            const res: string = await new Promise(async (resolve, reject) => {
                await this.client.del(`cn=${name},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    LoggerService.logInfo('user: ' + name + ' has been deleted');
                    resolve("success");
                });
            });
            if (res == "success") {
                this.strikeService.deleteUser(name);
            }
            return "fail";
        }
        catch (err) {
            LoggerService.logError(err.message, 'ldapjs');
            throw new InternalServerErrorException();
        }
    }

    private async addToGroup(name: string, tempGroup: group): Promise<string> {
        try {
            const change = {
                operation: 'add',
                modification: {
                    member: `cn=${name},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`
                }
            };
            if (tempGroup == group.MANAGERS) {
                await new Promise((resolve, reject) => {
                    this.client.modify(`cn=Domain Admins,cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, change, (err) => {
                        if (err) {
                            reject(err);
                        }
                        LoggerService.logInfo('user: ' + name + ' has been added to administrators');
                        resolve("success");
                    });
                });
            }
            return await new Promise((resolve, reject) => {
                this.client.modify(`cn=${tempGroup},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, change, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    LoggerService.logInfo('user: ' + name + ' has been added to group: ' + group);
                    resolve("success");
                });
            });
        }
        catch (err) {
            LoggerService.logError(err.message, 'ldapjs');
            throw new InternalServerErrorException();
        }
    }

    private async updateGroupOfUser(name: string, newGroup: group): Promise<void> {
        try {
            for (const tempGroup of this.groups) {
                if (newGroup != group.USERS) {
                    if (tempGroup != newGroup && await this.memberOf(name, tempGroup)) {
                        await this.deleteFromGroup(name, tempGroup);
                    }
                    else if (tempGroup == newGroup && !(await this.memberOf(name, tempGroup))) {
                        await this.addToGroup(name, tempGroup);
                    }
                }
                else {
                    if (await this.memberOf(name, tempGroup)) {
                        await this.deleteFromGroup(name, tempGroup);
                    }
                }
            }
        }
        catch (err: any) {
            throw err;
        }
    }

    private async deleteFromGroup(name: string, tempGroup: group): Promise<string> {
        try {
            await this.clientBind();
            const change = {
                operation: 'delete',
                modification: {
                    member: `cn=${name},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`
                }
            };
            if (tempGroup == group.MANAGERS) {
                await new Promise((resolve, reject) => {
                    this.client.modify(`cn=Domain Admins,cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, change, (err) => {
                        if (err) {
                            return reject(err);
                        }
                        LoggerService.logInfo('user: ' + name + ' has been deleted from administrators');
                        resolve("success");
                    });
                });
            }

            return await new Promise((resolve, reject) => {
                this.client.modify(`cn=${tempGroup},cn=Users,dc=${Constants.DOMAIN_NAME},dc=${Constants.DOMAIN_END}`, change, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    LoggerService.logInfo('user: ' + name + ' has been deleted from group: ' + tempGroup);
                    resolve("success");
                });
            });
        }
        catch (err) {
            LoggerService.logError(err.message, 'ldapjs');
        }
    }
}
