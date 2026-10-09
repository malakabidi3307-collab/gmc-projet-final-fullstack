type InputProps = {
  type?: string;
  placeholder?: string;
};
export default function Input({ type = "text", placeholder }: InputProps) {
  return <input type={type} placeholder={placeholder} />;
}
