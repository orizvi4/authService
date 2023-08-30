import { Injectable } from '@nestjs/common';
import { UserDTO } from 'src/common/user.dto';
import ldap from 'ldapjs';

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

    // async createUser(): Promise<void> {
    //     console.log("in");
    //     const client = ldap.createClient({
    //         url: `ldap://${DOMAIN_NAME}.${DOMAIN_END}`
    //     });
    
    //     try {
    //         await client.bind('cn=root', 'secret'); // Bind without a callback
    //         console.log("create");
    //         const entry = {
    //             cn: 'foo',
    //             sn: 'bar',
    //             email: 'foo@bar.com',
    //             objectclass: 'fooPerson'
    //         };
    //         await client.add('cn=foo, o=example', entry); // Add the entry without a callback
    //         console.log("add");
    
    //         console.log('User created successfully');
    //     } catch (error) {
    //         console.error('An error occurred:', error);
    //     } finally {
    //         client.unbind(); // Unbind the client connection
    //     }
    // }
}
