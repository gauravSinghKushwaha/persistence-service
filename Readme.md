                                    PERSISTENCE SERVER

This is a NodeJs based REST module. Which can be used as a generic resource server to store information in DB.

1) Takes regular properties properties from /src/config/properties/dev.properties. Can be put ANYWHERE , Can be named ANYTHING
2) Takes DB properties and connection settings from /src/config/properties/db.properties. Can be put ANYWHERE , Can be named ANYTHING
3) Uses basic auth for api caller authentication, use credentials given in properties file /src/config/properties/dev.properties as of now.
4) Hashes of sensitive information like password. Default algo - SHA-256, could be configured using properties file /src/config/properties/dev.properties.
   Fields requiring hashing could be declared in resource conf file located in folder ./src/config/resources.[Folder can be put ANYWHERE ,Folder Can be named ANYTHING]
5) It Logs access logs for all the rest calls in directory/file configured in properties file /src/config/properties/dev.properties.
6) It Logs application logs in directory/file configured in properties /src/config/properties/dev.properties.
    Level of  logs could be controlled from config as well. e.g warn,debug,info,error
7) Server running port could be changed from config along with API's versioning using /src/config/properties/dev.properties.
8) Encrypts sensitive information like email,phone-number. Default algo - aes-256-ctr, could be configured using properties file /src/config/properties/dev.properties.
   Fields requiring encryption could be declared in resource conf file located in folder ./src/config/resources/{resource}-conf.json.
   [Folder can be put ANYWHERE ,Folder Can be named ANYTHING]

RUNNING SERVER

1) With default properties files and resource folder
node .
[will use /src/config/properties/dev.properties /src/config/properties/db.properties /src/config/resources as default.]

2) With properties file names and resource folder display_name taken from command line input. These are searched in ./src/config folder by default
node . dev.properties db.properties resources
[will use /src/config/properties/ /src/config/properties/ /src/config/ as default location for conf argument.]

3) With properties files and resource folder taken from user given location using command line input.
node . c://proper/abc.properties c://proper/xyz.properties c://proper/resource

POSTMAN COLLECTION

https://www.getpostman.com/collections/8015c8fd8b51a63a988f

Example CURL COMMANDS

1) CREATE

POST /river/v1/resources HTTP/1.1
Host: localhost:9091
Content-Type: application/json
Authorization: Basic cml2ZXItZWphYjoxQDMkNV43KjkpLSs=
Cache-Control: no-cache
Postman-Token: f4af6d3e-d1ce-49ef-8263-ae3035944c54

{
  "schema":"river",
  "table":"user",
  "cached":true,
  "attr":{
    "username":"meuser21",
    "display_name":"displayme22",
    "password":"ad7878addf",
    "phonenumber":9999999999,
    "email":"abc@xyz.com",
    "age":18,
    "status":"active",
    "domain":"river.com",
    "resource":"android",
    "created_on":"2012-04-21T18:25:43-05:00",
    "created_by":1,
    "update_on":"2015-09-22T10:30:06.000Z",
    "updated_by":1

  }
}

2) UPDATE

PUT /river/v1/resources/52 HTTP/1.1
Host: localhost:9091
Content-Type: application/json
Authorization: Basic cml2ZXItZWphYjoxQDMkNV43KjkpLSs=
Cache-Control: no-cache
Postman-Token: 7b608aad-6972-1f01-3abd-810385f3822e

{
  "schema":"river",
  "table":"user",
  "cached":true,
  "attr":{
    "username":"c6hor",
    "display_name":"kahin6ka",
    "password":"nodfdfdfd",
    "phonenumber":9999999999,
    "email":"abc@xyz.com",
    "age":88,
    "status":"active",
    "domain":"river.com",
    "resource":"android",
    "update_on":"2015-09-22T10:30:06.000Z",
    "updated_by":1
  }
}

3) GET By ID

GET /river/v1/resources/55?schema=river&amp;table=user HTTP/1.1
Host: localhost:9091
Content-Type: application/json
Authorization: Basic cml2ZXItZWphYjoxQDMkNV43KjkpLSs=
Cache-Control: no-cache
Postman-Token: f32b34cb-6121-504a-61b8-c706b32edaa9


4) DELETE By ID

DELETE /river/v1/resources/56?schema=river&table=user HTTP/1.1
Host: localhost:9091
Content-Type: application/json
Authorization: Basic cml2ZXItZWphYjoxQDMkNV43KjkpLSs=
Cache-Control: no-cache
Postman-Token: 54141262-a202-788e-9b4c-fa384d3fbb2c


5) SEARCH by Search criteria

POST /river/v1/search HTTP/1.1
Host: localhost:9091
Content-Type: application/json
Authorization: Basic cml2ZXItZWphYjoxQDMkNV43KjkpLSs=
Cache-Control: no-cache
Postman-Token: d8539cc8-ef1f-8038-1500-3e96e5960277

{
  "schema":"river",
  "table":"user",
  "operation":"search",
  "fields":[
  	"id",
    "username",
    "display_name",
    "password",
    "phonenumber",
    "email",
    "age",
    "status",
    "domain",
    "resource",
    "created_on",
    "created_by",
    "update_on",
    "updated_by"
  ],
  "where":{
      "age":18,
      "status":"active",
      "domain":"river.com",
      "password":"ad7878addf",
      "phonenumber":9999999999,
      "email":"abc@xyz.com"
  },
  "orderby":{
    "order":[
      "status",
      "phonenumber",
      "email",
      "created_on",
      "update_on"
    ],
    "by":"asc"
  },
  "offset":20,
  "limit":200
}

6) POST delete based on criteria

POST /river/v1/delete HTTP/1.1
Host: localhost:9091
Content-Type: application/json
Authorization: Basic cml2ZXItZWphYjoxQDMkNV43KjkpLSs=
Cache-Control: no-cache
Postman-Token: c4ae08b1-3576-8fb1-1955-cb25f10f3ffc

{  
  "schema":"river",
  "table":"user",
  "operation":"delete",
  "where":{  
      "id":52
 }
}


Parkings :

1) Introduce caching...
2) Allowed operation list on resource
3) query builder to use var options = {sql: '...', nestTables: '_', timeout: 60000}