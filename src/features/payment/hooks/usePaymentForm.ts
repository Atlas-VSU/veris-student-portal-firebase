"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentFormData, paymentSchema } from "@/lib/validators";
import { OnlinePaymentMethod } from "../types";

export interface ImageData {
  file: File;
  preview: string;
}

export type FormStatus = "success" | "submitting" | "idle" | "error";

interface UsePaymentFormOptions {
  initialValues?: Partial<PaymentFormData>;
  onSubmitPayment?: (data: PaymentFormData, image: ImageData | null) => Promise<void>;
}

export function usePaymentForm(options?: UsePaymentFormOptions) {
  const [image, setImage] = useState<ImageData | null>(null);
  const [status, setStatus] = useState<FormStatus>("idle");
  const submitLockRef = useRef(false);

  const defaultValues: PaymentFormData = {
    userName: "",
    studentId: "",
    amount: 0,
    paymentMethod: "gcash",
    referenceNumber: "",
    senderNumber: "",
    notes: "",
    rejectionReason: "",
    imageUrl: "",
    type: undefined,
    paymentHistoryId: undefined,
    referenceId: undefined,
    ...options?.initialValues,
  };

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues,
  });

  const paymentMethod = form.watch("paymentMethod");
  const needsRef = paymentMethod === "gcash";
  const isGcash  = paymentMethod === "gcash";

  const handleMethodSelect = (value: OnlinePaymentMethod) => {
    form.setValue("paymentMethod", "gcash", { shouldValidate: true });
    form.setValue("referenceNumber", "");
    form.setValue("senderNumber", "");
    form.clearErrors(["referenceNumber", "senderNumber"]);
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setStatus("submitting");
    try {
      if (options?.onSubmitPayment) {
        await options.onSubmitPayment(data, image);
      } else {
        await new Promise(r => setTimeout(r, 1800));
      }
      setStatus("success");
    } catch (error) {
      console.error("Submission failed:", error);
      setStatus("idle");
      submitLockRef.current = false;
    }
  };

  const handleReset = () => {
    form.reset(defaultValues);
    setImage(null);
    setStatus("idle");
    submitLockRef.current = false;
  };

  return {
    form,
    image,
    setImage,
    status,
    needsRef,
    isGcash,
    handleMethodSelect,
    handleReset,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
