# 개발 환경

- 언어: TypeScript
- 프레임워크: NestJS
- DB: sqlite3
- 라이브러리: passport, TypeORM, bcrypt, eslint, jest

## 사용 이유

- **NestJs**는 node.js를 기반으로 서버 애플리케이션을 구축할 수 있는 프레임워크로 typescript를 지원하며 OOP, FP 등이 가능하다는 장점이 있습니다. 또한, express 같은 HTTP 서버 프레임워크를 사용하며, 경우에 따라 fastify를 사용하도록 구성할 수도 있기에 nestjs를 선택하였습니다.
- **sqlite**는 in-memory database로 pc에 설치하지 않고 메모리에 올려 구축이 가능하며, 기본적인 관계형 데이터베이스와 동일하게 작동하기에 선택하였습니다.
- **typeorm**은 node.js에서 사용할 수 있는 orm 라이브러리로, RDB 데이터를 객체로 유연하게 변형시켜줍니다.
- **passport**는 node.js 인증 관련 라이브러리로 가장 많이 사용되고 다양한 전략을 제공하며, 이에 대한 레퍼런스 또한 풍부하여 선택하였습니다.
- **bcrypt**는 암호화 라이브러리로 유저의 비밀번호를 암호화하기 위해 사용하였습니다.

# 구현

## User

- 유저 생성은 UsersService.create()를 호출하여 생성할 수 있습니다.
- 생성시 입력값의 유효성을 체크하고, 중복되는 ID가 있는지 확인한 뒤, 비밀번호를 해싱하여 DB에 저장합니다. 유효성 검증에 실패하거나 중복 ID가 존재하면 예외를 던집니다.

```ts
...
    const existedUser = await this.findOne(createUserDto.userId);
    if (existedUser) {
      throw new HttpException(
        { message: 'userId already exists' },
        HttpStatus.BAD_REQUEST,
      );
    }
...
```

- 유저 전체 조회는 UsersService.findAll(), 특정 유저 조회는 UsersService.findOne()을 호출하여 조회할 수 있습니다. 각각 typeorm의 find와 findOne을 통해 db의 데이터를 가져옵니다.

```ts
...
  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }
...
```

## 회원 가입

- 회원 가입은 `/auth/register` URI를 통해 진행합니다. AuthController.register() 메소드가 호출되며, 요청의 body가 전달됩니다.
- 전달받은 body의 user id와 password를 UsersService.create()에 전달하여 회원 가입을 수행합니다.
- 유효성 검증에 실패하지 않고 생성이 완료되면 authService.login()를 호출하여 생성된 해당 유저의 jwt 토큰 값을 반환합니다.

```ts
...
  @Post('register')
  async register(@Body() body) {
    const user = await this.createUser(body.userId, body.password);
    return this.authService.login({ userId: user.userId });
  }
...
```

## 로그인

- `/auth/login` URI를 통해 로그인을 진행합니다. AuthController.login() 메소드를 호출하며, 이때 local strategy를 사용하여 유효성 검사를 합니다. `@UseGuards(LocalAuthGuard)`는 정의한 local auth guard를 통해 local strategy로 사용자 유효성 검사를 수행하도록 도와줍니다.
- 로그인에 성공하면 jwt 토큰을 반환하며, 실패하면 401 상태코드를 반환합니다.

```ts
...
  async validate(userId: string, password: string) {
    const user = await this.authService.validateUser(userId, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
...
```

## Post

### 생성

- 게시글 생성은 `/posts/` URI로 POST 메소드 요청을 보내어 수행합니다. 이때 요청 메시지의 헤더에 넣은 토큰을 검사합니다. `@UseGuards(JwtAuthGuard)` 어노테이션으로 jwt strategy를 수행하며, 토큰의 유효성 검사에 실패하면 게시글 생성에 실패하게 됩니다.
- 토큰이 유효하여 PostsService.create()로 이동하면 작성하려는 게시글의 유효성을 체크합니다.

```ts
...
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createPostDto: CreatePostDto, @Request() req: any) {
    return this.postsService.create(createPostDto, req.user.userId);
  }
...
```

### 조회

- `/posts?limit=30&offset=0` URI로 전체 조회를 수행합니다. limit은 조회하려는 글의 개수로 볼 수 있고, offset은 건너뛰려는 글의 개수로 볼 수 있습니다.
- limit이나 offset을 생략하는 경우를 고려하여 기본값을 지정하였습니다. limit을 지정하지 않으면 기본값으로 10이 입력되고, offset을 지정하지 않으면 기본값으로 0이 지정됩니다.
- 조회하려는 게시글의 수와 게시글 배열을 object에 담아 반환합니다.

```ts
...
  async findAll(limit: number, offset: number) {
    limit = isNaN(limit) ? 10 : limit;
    offset = isNaN(offset) ? 0 : offset;
    const data = await this.postRepository.find({ skip: offset, take: limit });
    const res = { count: data.length, data: data };
    return res;
  }
...
```

- 특정 게시글을 조회하려면 `/posts/:id` URI로 접속합니다. `:id`에 조회하려는 게시글의 번호를 입력하며, 해당 번호의 게시글이 없는 경우 400 상태 코드를 반환합니다.
- 해당 게시글의 id, title, content, userId, createdDate, modifiedDate가 반환됩니다.

```ts
...
  async findOne(id: number): Promise<Post> {
    const post = await this.postRepository.findOneOrFail(id).catch(() => {
      const error = { id: `post with id(${id}) does not exist.` };
      throw new HttpException(
        { message: 'Input data is wrong', error },
        HttpStatus.BAD_REQUEST,
      );
    });
    return post;
  }
...
```

### 수정

- 게시글 수정은 `/posts/:id` URI로 PATCH 메소드를 요청으로 보내어 수행합니다.
- 요청 메시지의 body에는 수정하려는 제목과 내용을 {title:title, content:content} 형태로 담아 요청을 보내야 합니다.
- `@UseGuards(JwtAuthGuard)`를 사용하여 게시글 생성과 마찬가지로 토큰의 유효성을 검사합니다. 그리고 해당 토큰의 userId와 게시글의 작성자(userId)를 비교하여 같은 경우에만 수정을 완료할 수 있습니다. 일치하지 않는 경우 403 상태 코드를 반환합니다.
- 게시글의 유효성 검사를 진행하여 검증에 실패하는 경우 400 상태 코드를 반환합니다.

```ts
...
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req: any,
  ) {
    return this.postsService.update(+id, updatePostDto, req.user.userId);
  }
...
```

### 삭제

- 게시글 삭제는 `/posts/:id` URI 경로로 DELETE 메소드를 요청으로 보내어 수행합니다.
- `@UseGuards(JwtAuthGuard)`를 사용하여 토큰의 유효성을 검사하며, 토큰의 userId와 게시글의 작성자가 일치하지 않는 경우 403 상태 코드를 반환합니다.

```ts
...
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.postsService.remove(+id, req.user.userId);
  }
...
```

# 실행

- `npm start` 명령어로 애플리케이션을 실행합니다.

# Endpoint 호출 방법

## 회원 등록

- POST 메소드로 `/auth/register` 경로에 요청을 보내어 회원등록을 합니다.

```
$ curl -X POST http://localhost:3000/auth/register -d '{"userId":"testuser", "password":"password"}' -H "Content-Type: application/json" -w "\n%{http_code}\n"

{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlciIsImlhdCI6MTYzNDcwNjA4NywiZXhwIjoxNjM0NzA5Njg3fQ.MkLB1-clUwnbXxCIYWyTv3AY4dY8tmDmYSgKweMm4Uk"}
201
```

- userId와 password가 모두 채워지지 않은 경우 `400 Bad_request`가 응답으로 반환됩니다.

```
$ curl -X POST http://localhost:3000/auth/register -d '{"password":"password"}' -H "content-type: application/json" -w "\n%{http_code}\n"

{"message":"Invalid userId/password"}
400
```

- userId가 이미 있는 경우 `400 Bad_request`가 응답으로 반환됩니다.

```
$ curl -X POST http://localhost:3000/auth/register -d '{"userId":"testuser", "password":"password"}' -H "content-type: application/json" -w "\n%{http_code}\n"

{"message":"userId already exists"}
400
```

## 로그인

- POST 메소드로 `/auth/login` 경로에 요청을 보내어 로그인을 실행합니다.

```
$ curl -X POST localhost:3000/auth/login -d '{"userId":"testuser", "password":"password"}' -H "Content-Type: application/json" -w "\n%{http_code}\n"

{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlciIsImlhdCI6MTYzNDcwNzg2MiwiZXhwIjoxNjM0NzExNDYyfQ.jV_UQ6UQfSZPwUQ_juSYq5g7tbKi34RnVTJl-66r3lM"}
201
```

- userId나 password를 모두 입력하지 않으면 `401 Unauthorized`를 응답으로 받습니다.

```
$ curl -X POST localhost:3000/auth/login -d '{"userId":"testuser"}' -H "content-type: application/json"

{"statusCode":401,"message":"Unauthorized"}
```

- 일치하지 않는 password를 요청으로 보내면 `401 Unauthorized`를 응답으로 받습니다.

```
$ curl -X POST localhost:3000/auth/login -d '{"userId":"testuser", "password":"zzzzzz"}' -H "content-type: application/json"

{"statusCode":401,"message":"Unauthorized"}
```

- 존재하지 않는 userId를 요청으로 보내면 `401 Unauthorized`를 응답으로 받습니다.

```
$ curl -X POST localhost:3000/auth/login -d '{"userId":"noexistuser", "password":"zzzzzz"}' -H "content-type: application/json"

{"statusCode":401,"message":"Unauthorized"}
```

## 게시글 목록 조회

- GET 메소드로 `/posts` 경로에 요청을 보내어 게시글 목록을 조회합니다.

```
$ curl http://localhost:3000/posts -w "\n%{http_code}\n"

{"count":3,"data":[{"id":1,"title":"title","content":"content","userId":"testuser","createdDate":"2021-10-20T01:28:46.000Z","modifiedDate":"2021-10-20T01:28:46.000Z"},{"id":3,"title":"title3","content":"content22","userId":"testuser","createdDate":"2021-10-20T02:46:10.000Z","modifiedDate":"2021-10-20T02:47:07.303Z"},{"id":4,"title":"title","content":"content","userId":"testuser3","createdDate":"2021-10-20T03:22:28.000Z","modifiedDate":"2021-10-20T03:22:28.000Z"}]}
200
```

- GET 메소드로 `/posts?limit={limit}&offset={offset}` 경로에 요청을 보내어 해당 게시글 목록을 조회합니다.
  - `limit`에는 조회하려는 게시글의 수가 입력됩니다. 입력하지 않으면 기본값으로 10이 입력됩니다.
  - `offset`에는 skip 하려는 게시글의 수가 입력됩니다. 입력하지 않으면 기본값으로 0이 입력됩니다.

```
$ curl "http://localhost:3000/posts?limit=1&offset=2" -w "\n%{http_code}\n"

{"count":1,"data":[{"id":4,"title":"title","content":"content","userId":"testuser3","createdDate":"2021-10-20T03:22:28.000Z","modifiedDate":"2021-10-20T03:22:28.000Z"}]}
200
```

## 게시글 조회

- GET 메소드로 `/posts/:id` 경로에 요청을 보내어 특정 게시글을 조회합니다.
  - `:id`에는 조회하려는 게시글의 id가 입력됩니다.

```
$ curl http://localhost:3000/posts/4 -w "\n%{http_code}\n"

{"id":4,"title":"title","content":"content","userId":"testuser3","createdDate":"2021-10-20T03:22:28.000Z","modifiedDate":"2021-10-20T03:22:28.000Z"}
200
```

- id에 해당하는 게시글이 없는 경우 `400 Bad_request`가 반환됩니다.

```
$ curl http://localhost:3000/posts/40 -w "\n%{http_code}\n"

{"message":"Input data is wrong","error":{"id":"post with id(40) does not exist."}}
400
```

## 게시글 등록

- POST 메소드로 `/posts` 경로에 요청을 보내어 게시글을 등록합니다.
  - `title`에는 게시글의 제목이 입력됩니다.
  - `content`에는 게시글의 내용이 입력됩니다.

```
$ curl -X POST localhost:3000/posts -d '{"title":"post title", "content":"post content"}' -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlciIsImlhdCI6MTYzNDcwNzg2MiwiZXhwIjoxNjM0NzExNDYyfQ.jV_UQ6UQfSZPwUQ_juSYq5g7tbKi34RnVTJl-66r3lM" -w "\n%{http_code}\n"

{"title":"post title","content":"post content","userId":"testuser","id":5,"createdDate":"2021-10-20T05:02:33.000Z","modifiedDate":"2021-10-20T05:02:33.000Z"}
201
```

- 게시글의 제목이나 내용이 입력되지 않으면 `400 BAD_REQUEST`가 반환됩니다.

```
$ curl http://localhost:3000/posts -X POST -d '{"title":"title"}' -H "Content-Type: application/json" -H "authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlciIsImlhdCI6MTYzNDcwNzg2MiwiZXhwIjoxNjM0NzExNDYyfQ.jV_UQ6UQfSZPwUQ_juSYq5g7tbKi34RnVTJl-66r3lM" -w "\n%{http_code}\n"

{"message":"Content is empty"}
400
```

- 헤더에 토큰이 입력되지 않으면 `401 Unauthorized`가 반환됩니다.

```
$ curl http://localhost:3000/posts -X POST -d '{"title":"title", "content":"content"}' -H "Content-Type: application/json" -w "\n%{http_code}\n"

{"statusCode":401,"message":"Unauthorized"}
401
```

## 게시글 수정

- PATCH 메소드로 `/posts/:id` 경로에 요청을 보내어 게시글을 수정합니다.
  - `:id`에는 게시글의 id가 입력됩니다.

```
$ curl -X PATCH http://localhost:3000/posts/4 -d '{"title":"updated title"}' -H "content-type: application/json" -H "authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlcjMiLCJpYXQiOjE2MzQ3MTExMjcsImV4cCI6MTYzNDcxNDcyN30.PLoB7Fmvgzj0pN4cd4NXHCDthRpjbEMlTy24y3yystU" -w "\n%{http_code}\n"

{"id":4,"title":"updated title","content":"content","userId":"testuser3","createdDate":"2021-10-20T03:22:28.000Z","modifiedDate":"2021-10-20T06:26:35.530Z"}
200
```

- 해당 게시글의 작성자가 아닌 경우 `403 Forbidden`이 반환됩니다.

```
$ curl -X PATCH http://localhost:3000/posts/4 -d '{"title":"updated post title", "content":"updated post content"}' -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlciIsImlhdCI6MTYzNDcwNzg2MiwiZXhwIjoxNjM0NzExNDYyfQ.jV_UQ6UQfSZPwUQ_juSYq5g7tbKi34RnVTJl-66r3lM" -w "\n%{http_code}\n"

{"message":"This post was not written by login user"}
403
```

- 수정할 제목(title)이나 내용(content)이 없이 요청을 보내면 `400 Bad_request`가 반환됩니다.

```
$ curl -X PATCH http://localhost:3000/posts/4 -H "content-type: application/json" -H "authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlcjMiLCJpYXQiOjE2MzQ3MTExMjcsImV4cCI6MTYzNDcxNDcyN30.PLoB7Fmvgzj0pN4cd4NXHCDthRpjbEMlTy24y3yystU" -w "\n%{http_code}\n"

{"message":"Invalid Data"}
400
```

## 게시글 삭제

- DELETE 메소드로 `/posts/:id` 경로에 요청을 보내어 게시글을 삭제합니다.
  - `:id`는 삭제될 게시글의 id가 입력됩니다.

```
$ curl -X DELETE http://localhost:3000/posts/4 -H "content-type: application/json" -H "authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlcjMiLCJpYXQiOjE2MzQ3MTExMjcsImV4cCI6MTYzNDcxNDcyN30.PLoB7Fmvgzj0pN4cd4NXHCDthRpjbEMlTy24y3yystU" -w "\n%{http_code}\n"

{"title":"updated title","content":"content","userId":"testuser3","createdDate":"2021-10-20T03:22:28.000Z","modifiedDate":"2021-10-20T06:26:35.530Z"}
200
```

- id에 해당하는 게시글이 없는 경우 `400 Bad_request`가 응답으로 반환됩니다.

```
$ curl -X DELETE http://localhost:3000/posts/40 -H "content-type: application/json" -H "authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlcjMiLCJpYXQiOjE2MzQ3MTExMjcsImV4cCI6MTYzNDcxNDcyN30.PLoB7Fmvgzj0pN4cd4NXHCDthRpjbEMlTy24y3yystU" -w "\n%{http_code}\n"

{"message":"Input data is wrong","error":{"id":"post with id(40) does not exist."}}
400
```

- 로그인한 유저가 해당 게시글을 작성한 사용자가 아니라면 `403 Forbidden`이 응답으로 반환됩니다.

```
$ curl -X DELETE http://localhost:3000/posts/1 -H "content-type: application/json" -H "authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0dXNlcjMiLCJpYXQiOjE2MzQ3MTExMjcsImV4cCI6MTYzNDcxNDcyN30.PLoB7Fmvgzj0pN4cd4NXHCDthRpjbEMlTy24y3yystU" -w "\n%{http_code}\n"

{"message":"This post was not written by login user"}
403
```

# API 명세

| Description      | Method | URI                                            | request                                                                                                                                                                     | response                               |
| ---------------- | ------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 유저 생성        | POST   | /auth/register                                 | body<br>- `userId`: 생성하려는 유저의 ID<br>- `password`: 생성하려는 유저의 password                                                                                        | `access_token`: 생성한 유저의 jwt 토큰 |
| 유저 로그인      | POST   | /auth/login                                    | body<br>- `userId`: 유저의 ID<br>- `password`: 유저의 password                                                                                                              | 로그인된 유저의 jwt 토큰               |
| 게시글 목록 조회 | GET    | /posts<br>/posts?limit={limit}&offset={offset} | query parameter<br>- `{limit}`: 조회하려는 게시글의 수. 명시하지 않으면 기본값 10이 입력됨.<br>- `{offset}`: skip 하려는 게시글의 수. 명시하지 않으면 기본값 0이 입력됨.    | 조회하는 게시글 수와 게시글 배열       |
| 게시글 조회      | GET    | /posts/:id                                     | path parameter<br>- `:id`: 조회하려는 게시글의 id                                                                                                                           | 조회하려는 게시글의 정보               |
| 게시글 생성      | POST   | /posts                                         | header<br>- `Authoriztion`: 인증 토큰 값. 필수<br><br>body<br>- `title`: 게시글 제목. 필수<br>- `content`: 게시글 내용. 필수                                                | 생성된 게시글 정보                     |
| 게시글 수정      | PATCH  | /posts/:id                                     | header<br>- `Authoriztion`: 인증 토큰 값. 필수<br><br>path parameter<br>- `:id`: 수정하려는 게시글의 id<br><br>body<br>- `title`: 게시글 제목.<br>- `content`: 게시글 내용. | 수정된 게시글 정보                     |
| 게시글 삭제      | DELETE | /posts/:id                                     | header<br>- `Authoriztion`: 인증 토큰 값. 필수<br><br>path parameter<br>- `:id`: 삭제하려는 게시글의 id                                                                     | 삭제된 게시글 정보                     |
