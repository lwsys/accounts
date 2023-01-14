import { PrismaServicePassword } from './libs/password/index';

import {
  ConnectionInformations,
  CreateUserServicePassword,
  DatabaseInterface,
  Session,
  User,
} from '@accounts/types';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// const main = async ()=>{
// 	await prisma.user.create({
// 		"data":{
// 			"email":"hello owrld@qq.com"
// 		}
// 	})
// }
// main()
export class Prisma implements DatabaseInterface {
  private client: PrismaClient;
  private passwordService: PrismaServicePassword;

  constructor(client: PrismaClient) {
    this.client = client;
    this.passwordService = new PrismaServicePassword({
      database: client,
    });
  }

  findUserById(userId: string): Promise<User | null> {
    return this.passwordService.findUserById(userId);
  }
  async findUserByServiceId(serviceName: string, serviceId: string): Promise<User | null> {
    const service = await this.client.userService.findFirst({
      where: {
        name: serviceName,
        id: serviceId,
      },
      select: {
        User: true,
      },
    });
    return service?.User;
  }
  async setService(userId: string, serviceName: string, data: object): Promise<void> {
    //TODO data be used
    await this.client.userService.create({
      data: {
        userId: userId,
        name: serviceName,
        token: data + '',
      },
    });
  }
  async unsetService(userId: string, serviceName: string): Promise<void> {
    await this.client.userService.delete({
      where: {
        userId_name: {
          userId,
          name: serviceName,
        },
      },
    });
  }
  async setUserDeactivated(userId: string, deactivated: boolean): Promise<void> {
    await this.client.user.update({
      where: {
        id: userId,
      },
      data: {
        deactivated: deactivated,
      },
    });
  }
  findSessionById(sessionId: string): Promise<Session | null> {
    throw new Error('Method not implemented.');
  }
  findSessionByToken(token: string): Promise<Session | null> {
    throw new Error('Method not implemented.');
  }
  createSession(
    userId: string,
    token: string,
    connection: ConnectionInformations,
    extraData?: object | undefined
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }
  updateSession(
    sessionId: string,
    connection: ConnectionInformations,
    newToken?: string | undefined
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
  invalidateSession(sessionId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  invalidateAllSessions(userId: string, excludedSessionIds?: string[] | undefined): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async createUser(user: CreateUserServicePassword): Promise<string> {
    return await this.passwordService.createUser(user);
  }
  async findUserByEmail(email: string): Promise<User | null> {
    return await this.passwordService.findUserByEmail(email);
  }
  async findUserByUsername(username: string): Promise<User | null> {
    return await this.passwordService.findUserByUsername(username);
  }
  async findUserByResetPasswordToken(token: string): Promise<User | null> {
    return await this.passwordService.findUserByResetPasswordToken(token);
  }
  async findUserByEmailVerificationToken(token: string): Promise<User | null> {
    return await this.passwordService.findUserByEmailVerificationToken(token);
  }
  async findPasswordHash(userId: string): Promise<string | null> {
    return await this.passwordService.findPasswordHash(userId);
  }
  async setPassword(userId: string, newPassword: string): Promise<void> {
    await this.passwordService.setPassword(userId, newPassword);
  }
  async setUsername(userId: string, newUsername: string): Promise<void> {
    await this.passwordService.setUsername(userId, newUsername);
  }
  async addResetPasswordToken(userId: string, email: string, token: string): Promise<void> {
    await this.passwordService.addResetPasswordToken(userId, email, token);
  }
  async addEmail(userId: string, newEmail: string, verified: boolean): Promise<void> {
    await this.passwordService.addEmail(userId, newEmail, verified);
  }
  async removeEmail(userId: string, email: string): Promise<void> {
    await this.passwordService.removeEmail(userId, email);
  }
  async verifyEmail(userId: string, email: string): Promise<void> {
    await this.passwordService.verifyEmail(userId, email);
  }
  async addEmailVerificationToken(userId: string, email: string, token: string): Promise<void> {
    await this.passwordService.addEmailVerificationToken(userId, email, token);
  }
  async removeAllResetPasswordTokens(userId: string): Promise<void> {
    await this.passwordService.removeAllResetPasswordTokens(userId);
  }
  findUserByLoginToken(token: string): Promise<User | null> {
    throw new Error('Method not implemented.');
  }
  addLoginToken(userId: string, email: string, token: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  removeAllLoginTokens(userId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
