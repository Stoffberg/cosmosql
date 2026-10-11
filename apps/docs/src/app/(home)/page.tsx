import Link from "next/link";
import { ApiExplorer, type ApiMethod } from "@/components/home/api-explorer";
import { CodeBlock } from "@/components/home/code-block";
import { CostLedger } from "@/components/home/cost-ledger";
import { FeatureIndex } from "@/components/home/feature-index";
import { Hero } from "@/components/home/hero";
import { InstallCommand } from "@/components/home/install-command";
import { SdkComparison } from "@/components/home/sdk-comparison";
import { Section } from "@/components/home/section";
import { QUICKSTART_URL } from "@/lib/site";

const API_SAMPLES = [
  {
    name: "container",
    note: "schema in, types out",
    code: `
import { container, field } from "cosmosql";

export const users = container("users", {
  id: field.string(),
  email: field.string(),
  name: field.string(),
  bio: field.string().optional(),
  age: field.number(),
  isActive: field.boolean().default(true),
  createdAt: field.date(),
}).partitionKey("email");
`,
  },
  {
    name: "create",
    note: "required fields enforced",
    code: `
const user = await db.users.create({
  data: {
    id: "u_1",
    email: "ada@lovelace.dev",
    name: "Ada Lovelace",
    age: 36,
    createdAt: new Date(),
  },
});
// isActive defaults to true, bio stays optional
`,
  },
  {
    name: "findUnique",
    note: "point read, 1 RU",
    code: `
const user = await db.users.findUnique({
  where: { id: "u_1", email: "ada@lovelace.dev" },
  select: { name: true, age: true },
});
// { name: string; age: number } | null
`,
  },
  {
    name: "findMany",
    note: "scoped to one partition",
    code: `
const adults = await db.users.findMany({
  partitionKey: "ada@lovelace.dev",
  where: { isActive: true, age: { gte: 18 } },
  orderBy: { createdAt: "desc" },
  take: 20,
});
`,
  },
  {
    name: "update",
    note: "typed partial patches",
    code: `
await db.users.update({
  where: { id: "u_1", email: "ada@lovelace.dev" },
  data: { name: "Ada King" },
});

await db.users.updateMany({
  where: { isActive: false },
  data: { bio: "archived" },
  enableCrossPartitionQuery: true,
  onProgress: (stats) => console.log(\`\${stats.percentage}%\`),
});
`,
  },
  {
    name: "delete",
    note: "by id and partition key",
    code: `
await db.users.delete({
  where: { id: "u_1", email: "ada@lovelace.dev" },
});
`,
  },
  {
    name: "aggregate",
    note: "count, sum, avg, min, max",
    code: `
const stats = await db.orders.aggregate({
  partitionKey: "customer_42",
  where: { status: "paid" },
  _count: true,
  _sum: { total: true },
  _avg: { total: true },
});
// stats._sum.total: number | null
`,
  },
  {
    name: "groupBy",
    note: "grouped, sorted, typed",
    code: `
const topCategories = await db.orders.groupBy({
  by: "category",
  enableCrossPartitionQuery: true,
  _count: true,
  _sum: { total: true },
  orderBy: { _sum_total: "desc" },
  take: 5,
});
`,
  },
];

const START_STEPS = ["Install", "Define a container", "Query it"];

export default function HomePage() {
  const apiMethods: ApiMethod[] = API_SAMPLES.map((sample) => ({
    name: sample.name,
    note: sample.note,
    code: <CodeBlock code={sample.code} />,
  }));

  return (
    <>
      <Hero />

      <Section
        id="bill"
        index="01"
        label="The bill"
        title="Every query is a line item."
        intro="Cosmos DB bills in request units, and the way you address a document decides how many you spend. CosmosQL makes the cheap path the default and the expensive one explicit."
      >
        <CostLedger />
      </Section>

      <Section
        id="compare"
        index="02"
        label="Compared"
        title="Same lookup. Fewer ways to get it wrong."
        intro="The official SDK will happily run a query without a partition key and hand you back any. CosmosQL reads the partition key off your schema and won't build until you supply it."
      >
        <SdkComparison />
      </Section>

      <Section
        id="api"
        index="03"
        label="The API"
        title="Prisma-shaped. Partition-aware."
        intro="If you have used Prisma, you already know the method names. The difference is that every one of them knows where your partition key lives."
      >
        <ApiExplorer methods={apiMethods} />
      </Section>

      <Section
        id="features"
        index="04"
        label="In the box"
        title="Everything after the first query."
        intro="The parts you would otherwise write yourself, built on the same schema and the same types."
      >
        <FeatureIndex />
      </Section>

      <section
        aria-labelledby="start-title"
        className="crosshair relative border-t border-rule"
      >
        <div className="grid gap-12 px-5 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:px-14 lg:py-28">
          <div className="reveal">
            <h2
              id="start-title"
              className="text-balance font-display text-[clamp(34px,5.4vw,64px)] font-medium leading-[1.02] tracking-[-0.04em] font-stretch-condensed text-ink"
            >
              Start with one container
              <span className="text-signal">.</span>
            </h2>
            <ol className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[13px] text-ink-2">
              {START_STEPS.map((step, index) => (
                <li key={step} className="flex items-baseline gap-2.5">
                  <span className="text-ink-3">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="reveal flex flex-col gap-4 self-end">
            <InstallCommand />
            <Link
              href={QUICKSTART_URL}
              className="group flex h-12 items-center justify-between bg-ink px-5 font-mono text-[13px] text-paper transition-colors hover:bg-signal"
            >
              Five-minute quickstart
              <span
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
