import { Injectable } from '@nestjs/common';
import { UserDTO } from 'src/common/user.dto';
const ldap = require('ldapjs');

var ActiveDirectory = require('activedirectory');

const ADMIN_USER: string = "shaleb@orizvi.test";
const ADMIN_PASWORD: string = "Turhmch123";
const DOMAIN_NAME: string = "orizvi";
const DOMAIN_END: string = "test";

@Injectable()
export class ActiveDirectoryService {
    config = {
        url: `ldap://${DOMAIN_NAME}.${DOMAIN_END}`,
        baseDN: `dc=${DOMAIN_NAME},dc=${DOMAIN_END}`,
        username: ADMIN_USER,
        password: ADMIN_PASWORD
    };
    activeDirectory = new ActiveDirectory(this.config);

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

    async createUser(body: UserDTO): Promise<string> {
        const client = await ldap.createClient({
            url: `ldap://orizvi.test`
        });
        
        try {
            await client.bind(`cn=shaleb,cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, 'Turhmch123', (err) => {
                if (err) {
                    console.log("binding error " + err);
                }
                else {
                    console.log("binded");
                }
            });
            const entry = {
                userPrincipalName: body.username,
                sAMAccountName: body.username,
                givenName: body.givenName,
                sn: body.sn,
                displayName: body.displayName,
                mail: body.mail,
                objectClass: 'user'

            };
            await client.add(`cn=${body.givenName},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, entry, (addErr) => {
                if (addErr) {
                    console.log("not added " +addErr);
                    return "fail";
                }
                else {
                    console.log('User created successfully');
                    return "success";
                }
            });
    
        } catch (error) {
            console.log('An error occurred:'+ error);
            return "error";
        } finally {
            await client.unbind();
        }
    }

    async deleteUser(name: string): Promise<string> {
        const client = await ldap.createClient({
            url: `ldap://orizvi.test`
        });
        
        try {
            await client.bind(`cn=shaleb,cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, 'Turhmch123', (err) => {
                if (err) {
                    console.log("binding error " + err);
                }
                else {
                    console.log("binded");
                }
            });
            await client.del(`cn=${name},cn=Users,dc=${DOMAIN_NAME},dc=${DOMAIN_END}`, (addErr) => {
                if (addErr) {
                    console.log("not deleted " +addErr);
                    return "fail";
                }
                else {
                    console.log('User deleted successfully');
                    return "success";
                }
            });
    
        } catch (error) {
            console.log('An error occurred:'+ error);
            return "error";
        } finally {
            await client.unbind();
        }
    }
}
