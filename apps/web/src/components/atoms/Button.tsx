type ButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
};
export default function Button({ children, type = "button" }: ButtonProps) {
  return <button type={type}>{children}</button>;
}
