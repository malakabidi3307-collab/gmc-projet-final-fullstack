import Label from "../atoms/Label";
import Input from "../atoms/Input";

type FormFieldProps = {
  label: string;
  type?: string;
  placeholder?: string;
};

export default function FormField({
  label,
  type = "text",
  placeholder,
}: FormFieldProps) {
  return (
    <div>
      <Label>{label}</Label>

      <Input type={type} placeholder={placeholder} />
    </div>
  );
}
