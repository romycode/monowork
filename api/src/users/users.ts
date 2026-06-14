export type User = {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export type UsersRepository = {
  findAll: () => Promise<User[]>
  findById: (id: string) => Promise<User | undefined>
  upsert: (
    id: string,
    data: { email: string; name: string; password: string },
  ) => Promise<{ user: User; created: boolean } | undefined>
  update: (
    id: string,
    data: { email?: string | undefined; name?: string | undefined; password?: string | undefined },
  ) => Promise<User | undefined>
  remove: (id: string) => Promise<User | undefined>
}
