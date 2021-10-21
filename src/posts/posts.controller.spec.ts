import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

jest.mock('./posts.service');

describe('PostsController', () => {
  let controller: PostsController;
  let service: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [PostsService],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    service = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('초기 상태에는 게시글이 없다', async () => {
    jest.spyOn(service, 'findAll').mockResolvedValue({ count: 0, data: [] });
    await controller.findAll('10', '0');
  });

  it('게시글을 생성하고 해당 게시글을 조회한다', async () => {
    expect.assertions(6);
    const id = '1';
    const title = 'title';
    const content = 'content';
    const createPostDto = { title, content };
    const userId = 'testuser';
    const createdDate = new Date();
    const modifiedDate = new Date();
    const req = { user: userId };
    jest.spyOn(service, 'create').mockResolvedValue({
      id: +id,
      ...createPostDto,
      userId,
      createdDate,
      modifiedDate,
    });
    const post = await controller.create(createPostDto, req);
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: +id,
      ...createPostDto,
      userId,
      createdDate,
      modifiedDate,
    });
    const foundPost = await controller.findOne(id);
    expect(foundPost.id).toEqual(+id);
    expect(foundPost.title).toEqual(title);
    expect(foundPost.content).toEqual(content);
    expect(foundPost.userId).toEqual(userId);
    expect(foundPost.createdDate).toEqual(createdDate);
    expect(foundPost.modifiedDate).toEqual(modifiedDate);
  });

  it('게시글을 수정한다', async () => {
    expect.assertions(6);
    const id = '1';
    const title = 'title';
    const content = 'content';
    const createPostDto = { title, content };
    const userId = 'testuser';
    const createdDate = new Date();
    const modifiedDate = new Date();
    const req = { user: userId };
    jest.spyOn(service, 'create').mockResolvedValue({
      id: +id,
      ...createPostDto,
      userId,
      createdDate,
      modifiedDate,
    });
    const post = await controller.create(createPostDto, req);

    const updateTitle = 'update Title';
    const updateContent = 'update Content';
    const updatePostDto = { title: updateTitle, content: updateContent };
    const updateModifiedDate = new Date();
    jest.spyOn(service, 'update').mockResolvedValue({
      id: +id,
      ...updatePostDto,
      userId,
      createdDate,
      modifiedDate: updateModifiedDate,
    });
    const updatedPost = await controller.update(id, updatePostDto, req);
    expect(updatedPost.id).toEqual(+id);
    expect(updatedPost.title).toEqual(updateTitle);
    expect(updatedPost.content).toEqual(updateContent);
    expect(updatedPost.userId).toEqual(userId);
    expect(updatedPost.createdDate).toEqual(createdDate);
    expect(updatedPost.modifiedDate).toEqual(updateModifiedDate);
  });

  it('게시글을 삭제한다', async () => {
    const id = '1';
    const title = 'title';
    const content = 'content';
    const createPostDto = { title, content };
    const userId = 'testuser';
    const createdDate = new Date();
    const modifiedDate = new Date();
    const req = { user: userId };
    jest.spyOn(service, 'create').mockResolvedValue({
      id: +id,
      ...createPostDto,
      userId,
      createdDate,
      modifiedDate,
    });
    const post = await controller.create(createPostDto, req);

    jest.spyOn(service, 'remove').mockResolvedValue({
      id: +id,
      ...createPostDto,
      userId,
      createdDate,
      modifiedDate,
    });
    const deletedPost = await controller.remove(id, req);
    expect(deletedPost.id).toEqual(+id);
    expect(deletedPost.title).toEqual(title);
    expect(deletedPost.content).toEqual(content);
    expect(deletedPost.userId).toEqual(userId);
    expect(deletedPost.createdDate).toEqual(createdDate);
    expect(deletedPost.modifiedDate).toEqual(modifiedDate);
  });
});
