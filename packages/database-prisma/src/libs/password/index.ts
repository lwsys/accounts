import { PrismaClient, User } from '@prisma/client';
// import { Collection, ObjectID, IndexOptions } from 'prisma';
import { CreateUserServicePassword, DatabaseInterfaceServicePassword } from '@accounts/types';
type CreateUserPayload = Parameters<PrismaClient['user']['create']>['0']['data'];
export interface PrismaServicePasswordOptions {
  /**
   * Prisma database.
   */
  database: PrismaClient;
  /**
   * The timestamps for the users collection.
   * Default 'createdAt' and 'updatedAt'.
   */
  timestamps?: {
    createdAt: string;
    updatedAt: string;
  };
  /**
   * Should the user collection use _id as string or ObjectId.
   * Default 'true'.
   */
  convertUserIdToMongoObjectId?: boolean;
  /**
   * Perform case intensitive query for user name.
   * Default 'true'.
   */
  // caseSensitiveUserName?: boolean;
  /**
   * Function that generate the id for new objects.
   */
  idProvider?: () => string;
  /**
   * Function that generate the date for the timestamps.
   * Default to `(date?: Date) => (date ? date.getTime() : Date.now())`.
   */
  dateProvider?: (date?: Date) => any;
}

const defaultOptions = {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  convertUserIdToMongoObjectId: true,
  dateProvider: (date?: Date) => (date ? date.getTime() : Date.now()),
};

export class PrismaServicePassword implements DatabaseInterfaceServicePassword {
  // Merged options that can be used
  private options: PrismaServicePasswordOptions & typeof defaultOptions;
  // Mongo database object
  private database: PrismaClient;
  // Mongo user collection
  private users: PrismaClient['user'];
  private services: PrismaClient['userService'];
  private passwords: PrismaClient['userPassword'];
  private emails: PrismaClient['userEmail'];

  constructor(options: PrismaServicePasswordOptions) {
    this.options = {
      ...defaultOptions,
      ...options,
      timestamps: { ...defaultOptions.timestamps, ...options.timestamps },
    };

    this.database = this.options.database;
    this.users = this.database.user;
    this.services = this.database.userService;
    this.passwords = this.database.userPassword;
    this.emails = this.database.userEmail;
  }

  // /**
  //  * Setup the mongo indexes needed for the password service.
  //  * @param options Options passed to the mongo native `createIndex` method.
  //  */
  // public async setupIndexes(options: Omit<IndexOptions, 'unique' | 'sparse'> = {}): Promise<void> {
  //   // Username index to allow fast queries made with username
  //   // Username is unique
  //   await this.userCollection.createIndex('username', {
  //     ...options,
  //     unique: true,
  //     sparse: true,
  //   });
  //   // Emails index to allow fast queries made with emails, a user can have multiple emails
  //   // Email address is unique
  //   await this.userCollection.createIndex('emails.address', {
  //     ...options,
  //     unique: true,
  //     sparse: true,
  //   });
  //   // Token index used to verify the email address of a user
  //   await this.userCollection.createIndex('services.email.verificationTokens.token', {
  //     ...options,
  //     sparse: true,
  //   });
  //   // Token index used to verify a password reset request
  //   await this.userCollection.createIndex('services.password.reset.token', {
  //     ...options,
  //     sparse: true,
  //   });
  // }

  /**
   * Create a new user by providing an email and/or a username and password.
   * Emails are saved lowercased.
   */
  public async createUser({
    password,
    username,
    email,
  }: //TODO 支持 addition props
  // ...cleanUser
  CreateUserServicePassword): Promise<string> {
    const user: CreateUserPayload = {
      UserPassword: {
        create: {
          bcrypt: password,
        },
      },
    };
    if (username) {
      user.username = username;
    }
    if (email) {
      user.emails = {
        create: [{ address: email.toLowerCase(), verified: false }],
      };
    }

    if (this.options.idProvider) {
      user.id = this.options.idProvider();
    }
    const ret = await this.users.create({
      data: user,
    });
    return ret.id;
  }

  /**
   * Get a user by his id.
   * @param userId Id used to query the user.
   */
  public async findUserById(userId: string): Promise<User | null> {
    const user = await this.users.findUnique({
      where: {
        id: userId,
      },
    });
    return user;
  }

  public async findUserByIdWithPassword(userId: string) {
    const user = await this.users.findUnique({
      where: {
        id: userId,
      },
      include: {
        services: {
          where: {
            name: 'password',
          },
        },
      },
    });
    return user;
  }

  /**
   * Get a user by one of his emails.
   * Email will be lowercased before running the query.
   * @param email Email used to query the user.
   */
  public async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.users.findFirst({
      where: {
        emails: {
          some: {
            address: email,
          },
        },
      },
    });
    return user;
  }

  /**
   * Get a user by his username.
   * Set the `caseSensitiveUserName` option to false if you want the username to be case sensitive.
   * @param email Email used to query the user.
   */
  public async findUserByUsername(username: string): Promise<User | null> {
    const user = await this.users.findFirst({
      where: {
        username: {
          equals: username,
        },
      },
    });
    return user;
  }

  /**
   * Return the user password hash.
   * If the user has no password set, will return null.
   * @param userId Id used to query the user.
   */
  public async findPasswordHash(userId: string): Promise<string | null> {
    const password = await this.passwords.findFirst({
      where: {
        userId: userId,
      },
    });
    return password?.bcrypt;
  }

  /**
   * Get a user by one of the email verification token.
   * @param token Verification token used to query the user.
   */
  public async findUserByEmailVerificationToken(token: string): Promise<User | null> {
    //TODO 看一下写入逻辑
    const user = await this.users.findFirst({
      where: {
        services: {
          some: {
            name: 'email',
            token: token,
          },
        },
      },
      // 'services.email.verificationTokens.token': token,
    });
    // if (user) {
    //   user.id = user._id.toString();
    // }
    return user;
  }

  /**
   * Get a user by one of the reset password token.
   * @param token Reset password token used to query the user.
   */
  public async findUserByResetPasswordToken(token: string): Promise<User | null> {
    const user = await this.users.findFirst({
      where: {
        services: {
          every: {
            name: 'password',
            token,
          },
        },
      },
    });
    return user;
  }

  /**
   * Add an email address for a user.
   * @param userId Id used to update the user.
   * @param newEmail A new email address for the user.
   * @param verified Whether the new email address should be marked as verified.
   */
  public async addEmail(userId: string, newEmail: string, verified: boolean): Promise<void> {
    const res = await this.users.update({
      where: {
        id: userId,
      },
      data: {
        emails: {
          create: {
            address: newEmail,
            verified,
          },
        },
      },
    });
    if (!res) {
      throw new Error('User not found');
    }
  }

  /**
   * Remove an email address for a user.
   * @param userId Id used to update the user.
   * @param email The email address to remove.
   */
  public async removeEmail(userId: string, email: string): Promise<void> {
    const ret = await this.users.update({
      data: {
        emails: {
          delete: {
            address: email,
          },
        },
      },
      where: {
        id: userId,
      },
    });
    if (!ret) {
      throw new Error('User not found');
    }
  }

  /**
   * Marks the user's email address as verified.
   * @param userId Id used to update the user.
   * @param email The email address to mark as verified.
   */
  public async verifyEmail(userId: string, email: string): Promise<void> {
    const ret = await this.users.update({
      where: {
        id: userId,
      },
      data: {
        emails: {
          update: {
            data: {
              verified: true,
            },
            where: {
              address: email,
            },
          },
        },
      },
    });
    if (!ret) {
      throw new Error('User not found');
    }
  }

  /**
   * Change the username of the user.
   * If the username already exists, the function will fail.
   * @param userId Id used to update the user.
   * @param newUsername A new username for the user.
   */
  public async setUsername(userId: string, newUsername: string): Promise<void> {
    const ret = await this.users.update({
      where: { id: userId },
      data: {
        username: newUsername,
      },
    });
    if (!ret) {
      throw new Error('User not found');
    }
  }

  /**
   * Change the password for a user.
   * @param userId Id used to update the user.
   * @param newPassword A new password for the user.
   */
  public async setPassword(userId: string, newPassword: string): Promise<void> {
    const ret = await this.passwords.update({
      data: {
        bcrypt: newPassword,
      },
      where: {
        userId: userId,
      },
    });
    if (!ret) {
      throw new Error('User not found');
    }
  }

  /**
   * Add an email verification token to a user.
   * @param userId Id used to update the user.
   * @param email Which address of the user's to link the token to.
   * @param token Random token used to verify the user email.
   */
  public async addEmailVerificationToken(
    userId: string,
    email: string,
    token: string
  ): Promise<void> {
    const { id: serviceID } = await this.emails.findFirst({
      where: {
        address: email,
      },
    });

    await this.services.update({
      data: {
        token,
      },
      where: {
        userId_name_serviceId: {
          name: 'email',
          userId: userId,
          serviceId: serviceID,
        },
      },
    });
  }

  /**
   * Add a reset password token to a user.
   * @param userId Id used to update the user.
   * @param email Which address of the user's to link the token to.
   * @param token Random token used to verify the user email.
   * @param reason Reason to use for the token.
   */
  public async addResetPasswordToken(userId: string, email: string, token: string): Promise<void> {
    const entity = await this.emails.findFirst({
      where: {
        address: email,
        userId: userId,
      },
    });
    if (entity) {
      await this.services.update({
        where: {
          userId_name_serviceId: {
            userId: userId,
            name: 'password.reset',
            serviceId: entity.id,
          },
        },
        data: {
          token: token,
        },
      });
    }
  }

  /**
   * Remove all the reset password tokens for a user.
   * @param userId Id used to update the user.
   */
  public async removeAllResetPasswordTokens(userId: string): Promise<void> {
    await this.services.deleteMany({
      where: {
        name: 'password.reset',
        userId,
      },
    });
  }
}
