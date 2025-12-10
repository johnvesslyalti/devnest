# DevNest — API Documentation

Base URL: `/api/v1`

---

# AUTH Routes

Request:

  POST: api/v1/auth/register

  {
    "name": "Johnvessly Alti",
    "username": "johnvesslyalti",
    "email": "altijohnvessly@gmail.com",
    "password": "123456"
  }

Response:

  {
    "message": "User registered successfully",
    "name": "Johnvessly Alti",
    "email": "altijohnvessly@gmail.com",
    "token": "generated_token"
  }

Request:

  POST: api/v1/auth/login

  {
    "email": "altijohnvessly@gmail.com",
    "password": "123456"
  }

Response:

  {
    "message": "Login successful",
    "name": "Johnvessly Alti",
    "email": "altijohnvessly@gmail.com",
    "token": "generated_token"
  }

Request:

# POST (posts) Routes

  POST: http://localhost:5000/api/v1/posts
  
  Request:

    {
        "content": "Hello World!"
    }

  Response:

    {
    "message": "Post created",
    "post": {
        "id": "cmizsiivz00019acmzsmga5hi",
        "content": "Hello World!",
        "authorId": "cmizrm7am00009acmpfxyk5ax",
        "createdAt": "2025-12-10T09:11:41.855Z",
        "updatedAt": "2025-12-10T09:11:41.855Z"
      }
    }

  GET: http://localhost:5000/api/v1/posts

  Reponse:

    [
    {
        "id": "cmizsiivz00019acmzsmga5hi",
        "content": "Hello World!",
        "authorId": "cmizrm7am00009acmpfxyk5ax",
        "createdAt": "2025-12-10T09:11:41.855Z",
        "updatedAt": "2025-12-10T09:11:41.855Z",
        "author": {
            "id": "cmizrm7am00009acmpfxyk5ax",
            "name": "Johnvessly Alti",
            "username": "johnvesslyalti",
            "email": "altijohnvessly@gmail.com",
            "password": "$2b$10$euFTBv405GGzvojZKRirXuk7LsCl5K1HYhmWwA9S7FSMn633o/BUu",
            "bio": null,
            "skills": [],
            "avatarUrl": null,
            "createdAt": "2025-12-10T08:46:33.837Z",
            "updatedAt": "2025-12-10T08:46:33.837Z"
        },
        "_count": {
            "likes": 0,
            "comments": 0
        }
      }
    ]

  GET BY ID: http://localhost:5000/api/v1/posts?=cmizsiivz00019acmzsmga5hi

  params: cmizsiivz00019acmzsmga5hi

  Response:

    [
    {
        "id": "cmizsiivz00019acmzsmga5hi",
        "content": "Hello World!",
        "authorId": "cmizrm7am00009acmpfxyk5ax",
        "createdAt": "2025-12-10T09:11:41.855Z",
        "updatedAt": "2025-12-10T09:11:41.855Z",
        "author": {
            "id": "cmizrm7am00009acmpfxyk5ax",
            "name": "Johnvessly Alti",
            "username": "johnvesslyalti",
            "email": "altijohnvessly@gmail.com",
            "password": "$2b$10$euFTBv405GGzvojZKRirXuk7LsCl5K1HYhmWwA9S7FSMn633o/BUu",
            "bio": null,
            "skills": [],
            "avatarUrl": null,
            "createdAt": "2025-12-10T08:46:33.837Z",
            "updatedAt": "2025-12-10T08:46:33.837Z"
        },
        "_count": {
            "likes": 0,
            "comments": 0
        }
    }
  ]

# LIKE Routes

POST: http://localhost:5000/api/v1/likes

Request:

  {
    "postId": "cmizsiivz00019acmzsmga5hi"
  }

Response:

  {
    "message": "Post liked",
    "like": {
        "id": "cmiztcu3o0000bjcm0b21j2po",
        "userId": "cmizrm7am00009acmpfxyk5ax",
        "postId": "cmizsiivz00019acmzsmga5hi",
        "createdAt": "2025-12-10T09:35:16.068Z"
    }
  }

GET: http://localhost:5000/api/v1/likes?=cmizsiivz00019acmzsmga5hi

Response:

  {
    "count": 1
  }

DELETE: http://localhost:5000/api/v1/likes

  Request: 

    {
    "postId": "cmizsiivz00019acmzsmga5hi"
    }

  Response:

    {
    "message": "Post unliked"
    }

# COMMENT Routes

POST: http://localhost:5000/api/v1/comments

  Request:

    {
    "postId": "cmizsiivz00019acmzsmga5hi",
    "content": "Hello Johnvessly Alti"
    }
  
  Response:

    {
    "message": "comment added",
    "comment": {
        "id": "cmizu14sk0000gjcmv2v8cpse",
        "content": "Hello Johnvessly Alti",
        "userId": "cmizrm7am00009acmpfxyk5ax",
        "postId": "cmizsiivz00019acmzsmga5hi",
        "createdAt": "2025-12-10T09:54:09.668Z",
        "updatedAt": "2025-12-10T09:54:09.668Z"
      }
    }
  
GET BY POSTID: http://localhost:5000/api/v1/comments?=cmizsiivz00019acmzsmga5hi

Response:

  [
    {
        "id": "cmizu14sk0000gjcmv2v8cpse",
        "content": "Hello Johnvessly Alti",
        "userId": "cmizrm7am00009acmpfxyk5ax",
        "postId": "cmizsiivz00019acmzsmga5hi",
        "createdAt": "2025-12-10T09:54:09.668Z",
        "updatedAt": "2025-12-10T09:54:09.668Z",
        "user": {
            "id": "cmizrm7am00009acmpfxyk5ax",
            "name": "Johnvessly Alti",
            "username": "johnvesslyalti",
            "email": "altijohnvessly@gmail.com",
            "password": "$2b$10$euFTBv405GGzvojZKRirXuk7LsCl5K1HYhmWwA9S7FSMn633o/BUu",
            "bio": null,
            "skills": [],
            "avatarUrl": null,
            "createdAt": "2025-12-10T08:46:33.837Z",
            "updatedAt": "2025-12-10T08:46:33.837Z"
        }
    }
  ]