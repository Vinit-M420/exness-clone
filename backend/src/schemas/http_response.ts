export enum HttpStatusCode  {
    Ok = 200,
    BadRequest   = 400,
    Unauthorized = 401,
    Forbidden    = 403,
    InputError   = 411,
    UnprocessableEntity  = 422,
    ServerError  = 500,
    ServiceUnavailable = 503,
    NoContent    = 204,
}