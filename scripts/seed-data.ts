import { PrismaClient } from "@internal/postgres-client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.POSTGRES_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🚀 Starting data generation...");

  // 1. Clean existing data (Optional - remove if you want to keep current data)
  // await prisma.like.deleteMany();
  // await prisma.comment.deleteMany();
  // await prisma.post.deleteMany();
  // await prisma.follow.deleteMany();
  // await prisma.user.deleteMany();

  const userCount = 100;
  const postsPerUser = 10;

  console.log(`👤 Creating ${userCount} users...`);
  const users = [];
  for (let i = 0; i < userCount; i++) {
    const user = await prisma.user.create({
      data: {
        username: `user_${i}_${Math.floor(Math.random() * 10000)}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        password: "password123", // In real apps, hash this!
      },
    });
    users.push(user);
  }

  console.log(`📝 Creating ${userCount * postsPerUser} posts...`);
  for (const user of users) {
    const postData = Array.from({ length: postsPerUser }).map((_, i) => ({
      content: `This is post number ${i} by ${user.username}. #coding #postgres`,
      authorId: user.id,
    }));
    await prisma.post.createMany({ data: postData });
  }

  console.log(`🤝 Creating random follows...`);
  for (const user of users) {
    // Each user follows 15 random other users
    const randomUsers = users
      .filter((u) => u.id !== user.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 15);

    for (const followedUser of randomUsers) {
      await prisma.follow.create({
        data: {
          followerId: user.id,
          followingId: followedUser.id,
        },
      }).catch(() => {}); // Ignore duplicate follows
    }
  }

  console.log("✅ Data generation complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
