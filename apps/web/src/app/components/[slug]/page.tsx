import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/config";
import { ComponentShowcase } from "@/features/catalog/component-showcase";
import { components } from "@/generated/components";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const generateStaticParams = () => {
  return components.map((component) => ({ slug: component.slug }));
};

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const entry = components.find((component) => component.slug === slug);

  if (!entry) {
    return { title: brand.name };
  }

  return {
    title: entry.title,
    description: entry.description,
  };
};

const ComponentPage = async ({ params }: PageProps) => {
  const { slug } = await params;

  if (!components.some((component) => component.slug === slug)) {
    notFound();
  }

  return <ComponentShowcase slug={slug} />;
};

export default ComponentPage;
