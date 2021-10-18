import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
  constructor(@InjectRepository(Post) private readonly postRepository: Repository<Post>) {}

  async create(createPostDto: CreatePostDto) {
    const post = new Post();
    post.title = createPostDto.title;
    post.content = createPostDto.content;
    post.userId = createPostDto.userId;
    return await this.postRepository.save(post);
  }

  async findAll(): Promise<Post []> {
    return await this.postRepository.find();
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postRepository.findOneOrFail(id)
      .catch(() => {
        const error = { id: `post with id(${id}) does not exist.` };
        throw new HttpException({ message: 'Input data is wrong', error }, HttpStatus.BAD_REQUEST);
      });
    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto) {
    const post = await this.postRepository.findOneOrFail(id)
      .catch(() => {
        const error = { id: `post with id(${id}) does not exist.` };
        throw new HttpException({ message: 'Input data is wrong', error }, HttpStatus.BAD_REQUEST);
      });
    post.content = updatePostDto.userId;
    post.title = updatePostDto.title;
    post.modifiedDate = new Date();
    return await this.postRepository.save(post);
  }

  async remove(id: number) {
    const post = await this.postRepository.findOneOrFail(id)
      .catch(() => {
        const error = { id: `post with id(${id}) does not exist.` };
        throw new HttpException({ message: 'Input data is wrong', error }, HttpStatus.BAD_REQUEST);
      });
    return await this.postRepository.remove(post);
  }
}
