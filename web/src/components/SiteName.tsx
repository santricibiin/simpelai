const split = (name: string): [string, string] => {
  const space = name.trim().indexOf(" ");
  if (space > 0) return [name.slice(0, space + 1), name.slice(space + 1)];

  const camel = [...name.matchAll(/[a-z0-9][A-Z]/g)].pop();
  if (camel?.index !== undefined) return [name.slice(0, camel.index + 1), name.slice(camel.index + 1)];

  return [name, ""];
};

export function SiteName({ name, className = "" }: { name: string; className?: string }) {
  const [head, tail] = split(name);

  return (
    <span className={className}>
      {head}
      {tail && <span className="text-crimson-500">{tail}</span>}
    </span>
  );
}
