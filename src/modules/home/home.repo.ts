import { prisma } from "../../utils/prisma"

export const homeRepo = {
    findAllPosts() {
        return prisma.post.findMany();
    }
}