import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { canonicalPayload, type LicenseArtifact } from "@/domain/artifact";
import { listLicenses } from "@/server/data";
import { ArtifactVerifier } from "./artifact-verifier";

/** Example artifacts built from the immutable revision records (unsigned, design track). */
function exampleArtifacts(license: Awaited<ReturnType<typeof listLicenses>>[number]) {
  const latest = license.revisions.at(-1);
  if (!latest) return [];
  const artifact: LicenseArtifact = {
    payload: canonicalPayload(license, latest),
    payloadHash: latest.payloadHash,
    signingKeyId: latest.signingKeyId,
    signature: null,
  };
  const tampered: LicenseArtifact = structuredClone(artifact);
  tampered.payload.entitlements["deployments.production.max"] = "10";
  return [
    { label: `Load ${license.id} artifact`, artifact: JSON.stringify(artifact, null, 2) },
    { label: "Load a tampered copy", artifact: JSON.stringify(tampered, null, 2) },
  ];
}

export async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, licenses] = await Promise.all([searchParams, listLicenses()]);
  const requested = Array.isArray(params.license) ? params.license[0] : params.license;
  const license = licenses.find((l) => l.id === requested) ?? licenses[0];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[{ label: "Licensing", href: "/licensing" }, { label: "Verify artifact" }]}
        />
        <PageHeader
          title="Verify artifact"
          description="Check a license artifact's format, payload integrity and match to the immutable revision record. Signatures are verified by the License Issuer."
        />
      </div>
      <ArtifactVerifier licenses={licenses} examples={license ? exampleArtifacts(license) : []} />
    </div>
  );
}
