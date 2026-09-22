import { PinForm } from "@/components/unlock/PinForm";

// A centred four-digit entry. Where to go afterwards comes from ?from=,
// which the proxy sets; anything that isn't a local path falls back to /.
export default async function UnlockPage(props: PageProps<"/unlock">) {
  const { from } = await props.searchParams;
  const target = typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <p className="label mb-6">Enter PIN</p>
      <PinForm from={target} />
    </main>
  );
}
