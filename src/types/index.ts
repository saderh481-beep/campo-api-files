export interface FileUpload {
    buffer: Uint8Array;
    filename: string;
    mimetype: string;
    size: number;
    fieldname: string;
}

export type ClientType = 'web' | 'app' ;

export interface AuthContext {
    clientType: ClientType;
    permissions: string[];
}