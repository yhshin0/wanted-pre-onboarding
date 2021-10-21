import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostsService } from './posts.service';

const mockPostRepository = () => ({
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  remove: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('PostsService', () => {
  let service: PostsService;
  let postRepository: MockRepository<Post>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getRepositoryToken(Post), useValue: mockPostRepository() },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    postRepository = module.get<MockRepository<Post>>(getRepositoryToken(Post));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('초기 상태에는 게시글이 없다', async () => {
    expect.assertions(2);
    const limit = 10;
    const offset = 0;
    postRepository.find.mockResolvedValue([]);
    const ret = await service.findAll(limit, offset);
    expect(ret.data).toEqual([]);
    expect(ret.count).toEqual(0);
  });

  it('게시글 등록 후 불러오면 성공한다', async () => {
    expect.assertions(3);
    const title = 'title';
    const content = 'content';
    const userId = 'testuser';
    const createPostDto = { title, content };
    postRepository.save.mockResolvedValue({ id: 1, ...createPostDto, userId });
    const post = await service.create(createPostDto, userId);
    postRepository.findOneOrFail.mockResolvedValue({
      id: 1,
      ...createPostDto,
      userId,
    });
    const foundPost = await service.findOne(post.id);
    expect(foundPost.title).toEqual(title);
    expect(foundPost.content).toEqual(content);
    expect(foundPost.userId).toEqual(userId);
  });

  it('title이 빈 상태로 게시글을 등록하면 400 상태 코드를 반환한다', async () => {
    expect.assertions(2);
    const title = '';
    const content = 'content';
    const userId = 'testuser';
    const createPostDto = { title, content };
    try {
      const post = await service.create(createPostDto, userId);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('content가 빈 상태로 게시글을 등록하면 400 상태 코드를 반환한다', async () => {
    expect.assertions(2);
    const title = 'title';
    const content = '';
    const userId = 'testuser';
    const createPostDto = { title, content };
    try {
      const post = await service.create(createPostDto, userId);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('limit과 offset을 지정하면 offset부터 limit 개수만큼의 게시글을 불러온다', async () => {
    expect.assertions(3);
    const posts = [];
    for (let i = 1; i < 12; i++) {
      const title = `title${i}`;
      const content = `content${i}`;
      const userId = 'testuser';
      const createPostDto = { title, content };
      postRepository.save.mockResolvedValue({
        id: i,
        ...createPostDto,
        userId,
      });
      const post = await service.create(createPostDto, userId);
      posts.push(post);
    }
    const limit = 3;
    const offset = 3;
    postRepository.find.mockResolvedValue(
      posts.filter((_, i) => i >= offset && i < offset + limit),
    );
    const foundPosts = await service.findAll(limit, offset);
    expect(foundPosts.count).toEqual(limit);
    expect(foundPosts.data.length).toEqual(limit);
    expect(foundPosts.data[0]).toEqual(posts[offset]);
  });

  it('limit과 offset을 지정하지 않으면 처음부터 10개의 게시글을 불러온다', async () => {
    expect.assertions(3);
    const posts = [];
    for (let i = 1; i < 12; i++) {
      const title = `title${i}`;
      const content = `content${i}`;
      const userId = 'testuser';
      const createPostDto = { title, content };
      postRepository.save.mockResolvedValue({
        id: i,
        ...createPostDto,
        userId,
      });
      const post = await service.create(createPostDto, userId);
      posts.push(post);
    }
    const limit = undefined;
    const offset = undefined;
    const defaultLimit = 10;
    const defaultOffset = 0;
    postRepository.find.mockResolvedValue(
      posts.filter(
        (_, i) => i >= defaultOffset && i < defaultOffset + defaultLimit,
      ),
    );
    const foundPosts = await service.findAll(+limit, +offset);
    expect(foundPosts.count).toEqual(10);
    expect(foundPosts.data.length).toEqual(10);
    expect(foundPosts.data[0]).toEqual(posts[0]);
  });

  it('존재하지 않는 게시글을 부르면 400 상태 코드를 반환한다', async () => {
    expect.assertions(2);
    const notExistedPostId = 999;
    try {
      postRepository.findOneOrFail.mockRejectedValue(HttpException);
      await service.findOne(notExistedPostId);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toEqual(HttpStatus.BAD_REQUEST);
    }
  });

  it('게시글 수정 후 동일한 글을 조회한다', async () => {
    expect.assertions(3);
    const title = 'title';
    const content = 'content';
    const userId = 'testuser';
    const createPostDto = { title, content };
    postRepository.save.mockResolvedValue({ id: 1, ...createPostDto, userId });
    const post = await service.create(createPostDto, userId);
    const updateTitle = 'update title';
    const updateContent = 'update content';
    const updatePostDto = { title: updateTitle, content: updateContent };
    postRepository.findOneOrFail.mockResolvedValue({
      id: 1,
      ...createPostDto,
      userId,
    });
    postRepository.save.mockResolvedValue({ id: 1, ...updatePostDto, userId });
    const updatePost = await service.update(post.id, updatePostDto, userId);
    postRepository.findOneOrFail.mockResolvedValue({
      id: 1,
      ...updatePostDto,
      userId,
    });
    const foundPost = await service.findOne(post.id);
    expect(foundPost.title).toEqual(updateTitle);
    expect(foundPost.content).toEqual(updateContent);
    expect(foundPost.userId).toEqual(userId);
  });

  it('title이 빈 상태로 게시글을 수정한다', async () => {
    expect.assertions(2);
    const title = 'title';
    const content = 'content';
    const userId = 'testuser';
    const createPostDto = { title, content };
    postRepository.save.mockResolvedValue({ id: 1, ...createPostDto, userId });
    const post = await service.create(createPostDto, userId);
    const updateTitle = undefined;
    const updateContent = 'update content';
    const updatePostDto = { title: updateTitle, content: updateContent };
    postRepository.findOneOrFail.mockResolvedValue({
      id: 1,
      ...createPostDto,
      userId,
    });
    postRepository.save.mockResolvedValue({
      id: 1,
      title: title,
      content: updateContent,
      userId: userId,
    });
    const updatePost = await service.update(post.id, updatePostDto, userId);
    postRepository.findOneOrFail.mockResolvedValue({
      id: 1,
      title: title,
      content: updateContent,
      userId: userId,
    });
    const foundPost = await service.findOne(post.id);
    expect(foundPost.title).toEqual(title);
    expect(foundPost.content).toEqual(updateContent);
  });

  it('content가 빈 상태로 게시글을 수정한다', async () => {
    expect.assertions(2);
    const title = 'title';
    const content = 'content';
    const userId = 'testuser';
    const createPostDto = { title, content };
    postRepository.save.mockResolvedValue({ id: 1, ...createPostDto, userId });
    const post = await service.create(createPostDto, userId);
    const updateTitle = 'update title';
    const updateContent = undefined;
    const updatePostDto = { title: updateTitle, content: updateContent };
    postRepository.findOneOrFail.mockResolvedValue({
      id: 1,
      ...createPostDto,
      userId: userId,
    });
    postRepository.save.mockResolvedValue({
      id: 1,
      title: updateTitle,
      content: content,
      userId: userId,
    });
    const updatePost = await service.update(post.id, updatePostDto, userId);
    postRepository.findOneOrFail.mockResolvedValue({
      id: 1,
      title: updateTitle,
      content: content,
      userId: userId,
    });
    const foundPost = await service.findOne(post.id);
    expect(foundPost.title).toEqual(updateTitle);
    expect(foundPost.content).toEqual(content);
  });

  it('title, content가 모두 빈 상태로 게시글을 수정하면 400 상태 코드를 반환한다', async () => {
    expect.assertions(2);
    const title = 'title';
    const content = 'content';
    const userId = 'testuser';
    const createPostDto = { title, content };
    postRepository.save.mockResolvedValue({ id: 1, ...createPostDto, userId });
    const post = await service.create(createPostDto, userId);
    const updateTitle = undefined;
    const updateContent = undefined;
    const updatePostDto = { title: updateTitle, content: updateContent };
    try {
      const updatePost = await service.update(post.id, updatePostDto, userId);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toEqual(HttpStatus.BAD_REQUEST);
    }
  });

  it('게시글 작성자와 수정하려는 유저가 다르면 403 상태 코드를 반환한다', async () => {
    expect.assertions(2);
    const title = 'title';
    const content = 'content';
    const userId = 'testuser';
    const createPostDto = { title, content };
    postRepository.save.mockResolvedValue({ id: 1, ...createPostDto, userId });
    const post = await service.create(createPostDto, userId);
    const updateTitle = 'updateTitle';
    const updateContent = 'updateContent';
    const updatePostDto = { title: updateTitle, content: updateContent };
    const differentUserId = 'differentUserId';
    try {
      postRepository.findOneOrFail.mockResolvedValue({
        id: 1,
        ...createPostDto,
        userId,
      });
      const updatePost = await service.update(
        post.id,
        updatePostDto,
        differentUserId,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toEqual(HttpStatus.FORBIDDEN);
    }
  });

  it('게시글을 생성한 후 삭제한다', async () => {
    const title = 'title';
    const content = 'content';
    const userId = 'testuser';
    const createPostDto = { title, content };
    postRepository.save.mockResolvedValue({ id: 1, ...createPostDto, userId });
    const post = await service.create(createPostDto, userId);
    postRepository.findOneOrFail.mockResolvedValue({
      id: 1,
      ...createPostDto,
      userId,
    });
    postRepository.remove.mockResolvedValue({
      id: 1,
      ...createPostDto,
      userId,
    });
    const deletedPost = await service.remove(post.id, userId);
    postRepository.find.mockResolvedValue([]);
    const posts = await service.findAll(10, 0);
    expect(posts.count).toEqual(0);
  });

  it('게시글 작성자와 삭제하려는 유저가 다르면 403 상태 코드를 반환한다', async () => {
    expect.assertions(2);
    const title = 'title';
    const content = 'content';
    const userId = 'testuser';
    const createPostDto = { title, content };
    postRepository.save.mockResolvedValue({ id: 1, ...createPostDto, userId });
    const post = await service.create(createPostDto, userId);
    const differentUserId = 'differentUserId';
    try {
      postRepository.findOneOrFail.mockResolvedValue({
        id: 1,
        ...createPostDto,
        userId,
      });
      const deletePost = await service.remove(post.id, differentUserId);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toEqual(HttpStatus.FORBIDDEN);
    }
  });
});
