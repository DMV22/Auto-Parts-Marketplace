import type { ReactNode } from "react";
import { InternalWorkspaceShell } from "@/components/internal-ops/InternalWorkspaceShell";

export default function InternalLayout({ children }: { children: ReactNode }) {
  return <InternalWorkspaceShell>{children}</InternalWorkspaceShell>;
}
