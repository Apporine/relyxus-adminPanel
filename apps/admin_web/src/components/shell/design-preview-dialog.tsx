"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Notice } from "@/components/ui/feedback";

/**
 * Design-track action dialog. It presents the real dialog contract (spec §31 title,
 * message, fields and button label) but, with no Control API connected, ends in an
 * explicit "nothing was saved" outcome instead of pretending to mutate.
 */
export function DesignPreviewDialog({
  trigger,
  triggerVariant = "secondary",
  triggerIcon,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  children,
}: {
  trigger: string;
  triggerVariant?: ButtonProps["variant"];
  triggerIcon?: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: ButtonProps["variant"];
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSubmitted(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          {triggerIcon}
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent title={title} description={description} dismissible={!children || submitted}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <DialogBody>
            {submitted ? (
              <Notice title="Not connected to the Control API">
                This is a design preview. Nothing was saved, sent or recorded in audit.
              </Notice>
            ) : (
              children
            )}
          </DialogBody>
          <DialogFooter>
            {submitted ? (
              <DialogClose asChild>
                <Button>Close</Button>
              </DialogClose>
            ) : (
              <>
                <DialogClose asChild>
                  <Button>Cancel</Button>
                </DialogClose>
                <Button type="submit" variant={confirmVariant}>
                  {confirmLabel}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
