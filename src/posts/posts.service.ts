import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly postRepository: Repository<Post>,
  ) {}

  async create(createPostDto: CreatePostDto, userId: string) {
    this.checkTitleContentEmpty(createPostDto.title, createPostDto.content);
    const post = new Post();
    post.title = createPostDto.title;
    post.content = createPostDto.content;
    post.userId = userId;
    return await this.postRepository.save(post);
  }

  async findAll(limit: number, offset: number) {
    limit = isNaN(limit) ? 10 : limit;
    offset = isNaN(offset) ? 0 : offset;
    const data = await this.postRepository
      .createQueryBuilder()
      .skip(offset)
      .take(limit)
      .getMany();
    const res = { count: data.length, data: data };
    return res;
  }

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

  async update(id: number, updatePostDto: UpdatePostDto, userId: string) {
    if (
      this.isTitleEmpty(updatePostDto.title) &&
      this.isContentEmpty(updatePostDto.content)
    ) {
      throw new HttpException(
        { message: 'Invalid Data' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const post = await this.findOne(id);

    this.checkPostWriter(post, userId);

    post.title = updatePostDto.title ? updatePostDto.title : post.title;
    post.content = updatePostDto.content ? updatePostDto.content : post.content;
    post.modifiedDate = new Date();
    return await this.postRepository.save(post);
  }

  async remove(id: number, userId: string) {
    const post = await this.findOne(id);

    this.checkPostWriter(post, userId);
    return await this.postRepository.remove(post);
  }

  private checkTitleContentEmpty(title: string, content: string) {
    if (this.isTitleEmpty(title)) {
      throw new HttpException(
        { message: 'Title is empty' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (this.isContentEmpty(content)) {
      throw new HttpException(
        { message: 'Content is empty' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private isTitleEmpty(title: string) {
    return title === null || title === undefined || title === '';
  }

  private isContentEmpty(content: string) {
    return content === null || content === undefined || content === '';
  }

  private checkPostWriter(post: Post, userId: string) {
    if (post.userId !== userId) {
      throw new HttpException(
        { message: `This post was not written by user(${userId})` },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
