import { CodeBlock } from "./code-block";

const AZURE_SDK_CODE = `
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient(connectionString);
const container = client
  .database("app")
  .container("users");

const { resources } = await container.items
  .query({
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: "u_1" }],
  })
  .fetchAll();

const user = resources[0]; // any
`;

const COSMOSQL_CODE = `
import { createClient } from "cosmosql";
import { users } from "./schema";

const db = await createClient({
  connectionString,
  database: "app",
}).withContainers({ users });

const user = await db.users.findUnique({
  where: { id: "u_1", email: "ada@lovelace.dev" },
});
// { id: string; email: string; name: string } | null
`;

const PANELS = [
  {
    name: "@azure/cosmos",
    verdict: "Compiles. Fans out to every partition.",
    code: AZURE_SDK_CODE,
    facts: [
      { label: "Result type", value: "any" },
      { label: "Partition key", value: "optional, easy to forget" },
      { label: "Runtime dependencies", value: "11 direct" },
    ],
    isPreferred: false,
  },
  {
    name: "cosmosql",
    verdict: "Point read. One partition, 1 RU.",
    code: COSMOSQL_CODE,
    facts: [
      { label: "Result type", value: "inferred from your schema" },
      { label: "Partition key", value: "required by the compiler" },
      { label: "Runtime dependencies", value: "0" },
    ],
    isPreferred: true,
  },
];

export function SdkComparison() {
  return (
    <div className="reveal grid border border-rule-strong lg:grid-cols-2">
      {PANELS.map((panel) => (
        <div
          key={panel.name}
          className={`flex min-w-0 flex-col border-rule-strong first:border-b lg:first:border-b-0 lg:first:border-r ${panel.isPreferred ? "bg-paper-raised" : ""}`}
        >
          <div className="flex flex-col items-start gap-1 border-b border-rule px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="font-mono text-[13px] text-ink">{panel.name}</span>
            <span
              className={`font-mono text-[11.5px] ${panel.isPreferred ? "text-ink-2" : "text-signal"}`}
            >
              {panel.verdict}
            </span>
          </div>
          <div className="flex-1">
            <CodeBlock code={panel.code} />
          </div>
          <dl className="border-t border-rule">
            {panel.facts.map((fact) => (
              <div
                key={fact.label}
                className="flex items-baseline justify-between gap-4 border-b border-rule px-5 py-2.5 last:border-b-0"
              >
                <dt className="text-[13px] text-ink-3">{fact.label}</dt>
                <dd className="text-right font-mono text-[12.5px] text-ink">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
