type LabelProps = {
  children: React.ReactNode;
};
export default function Label({ children }: LabelProps) {
  return <label>{children}</label>;
}
