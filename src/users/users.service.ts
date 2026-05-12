import { Injectable } from "@nestjs/common";
import { UserRepository } from "./users.repository";

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string) {
    return this.userRepository.findById(id);
  }

  async findByUsername(username: string) {
    return this.userRepository.findByUsername(username);
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }
}
