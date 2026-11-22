"use client";

import { useAppUser } from "@/components/app/AppContext";

export default function Greeting() {
  const { user } = useAppUser();
  return (
    <>
      Hi, {user.name} <span aria-hidden="true">🌱</span>
    </>
  );
}
