import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Create super admin (agency owner)
  const admin = await prisma.user.upsert({
    where: { email: "info@multichoiceagency.nl" },
    update: {},
    create: {
      email: "info@multichoiceagency.nl",
      name: "Marketing Go Admin",
      companyName: "Multichoice Agency",
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  })
  console.log("Admin user:", admin.email)

  // Create agency workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "multichoice-agency" },
    update: {},
    create: {
      name: "Multichoice Agency",
      slug: "multichoice-agency",
      website: "https://multichoiceagency.nl",
      members: {
        create: { userId: admin.id, role: "OWNER" },
      },
    },
  })
  console.log("Agency workspace:", workspace.name)

  // Pre-register Rijschool Zumrut as a client
  const rijschool = await prisma.user.upsert({
    where: { email: "info@rijschoolzumrut.nl" },
    update: {},
    create: {
      email: "info@rijschoolzumrut.nl",
      name: "Rijschool Zumrut",
      companyName: "Rijschool Zumrut",
      role: "CLIENT",
      emailVerified: new Date(),
    },
  })
  console.log("Client user:", rijschool.email)

  // Create workspace for Rijschool Zumrut
  const rijschoolWorkspace = await prisma.workspace.upsert({
    where: { slug: "rijschool-zumrut" },
    update: {},
    create: {
      name: "Rijschool Zumrut",
      slug: "rijschool-zumrut",
      website: "https://rijschoolzumrut.nl",
      members: {
        create: [
          { userId: rijschool.id, role: "OWNER" },
          { userId: admin.id, role: "EDITOR" },
        ],
      },
    },
  })
  console.log("Client workspace:", rijschoolWorkspace.name)

  console.log("\nSeeding complete!")
  console.log("Login at /login with:")
  console.log("  info@multichoiceagency.nl  (SUPER_ADMIN)")
  console.log("  info@rijschoolzumrut.nl    (CLIENT)")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
