import cosmosqlPackage from "cosmosql/package.json";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip bg-paper text-ink">
      <div className="grain" aria-hidden="true" />
      <SiteHeader version={cosmosqlPackage.version} />
      <main className="mx-auto w-full max-w-[1240px] flex-1 border-x border-rule">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
