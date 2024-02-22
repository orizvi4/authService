export class Constants {
    public static readonly LOGGER_SERVICE: string = 'http://192.168.1.6:3005';
    public static readonly ELASTIC_INDEX: string = 'auth-service';
    public static readonly ADMIN_USER: string = "Administrator";
    public static readonly ADMIN_PASSWORD: string = "Cobra123";
    public static readonly DOMAIN_NAME: string = "cobra";
    public static readonly DOMAIN_END: string = "test";
    public static readonly JWT_SECRET: string = "orizvitheking";
    public static readonly ACCESS_TOKEN_EXPIRE: string = '5m';//1m
    public static readonly REFRESH_TOKEN_EXPIRE: string = '7d';
    public static readonly INVALID_TEXT: RegExp = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/;
    public static readonly WEBSOCKET_PATH: string = 'http://192.168.1.5:3006';
}