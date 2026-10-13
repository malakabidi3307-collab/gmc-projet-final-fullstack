import FormField from "../molecules/FormField";
import Button from "../atoms/Button";

export default function LoginForm() {
  return (
    <form>
      <FormField label="Email" type="email" placeholder="Entrez votre email" />

      <FormField
        label="Mot de passe"
        type="password"
        placeholder="Entrez votre mot de passe"
      />

      <Button type="submit">Se connecter</Button>
    </form>
  );
}
