import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ConsentSectionProps {
    agreed: boolean;
    setAgreed: (agreed: boolean) => void;
}

export function ConsentSection({ agreed, setAgreed }: ConsentSectionProps) {
    return (
        <div className="bg-primary/5 p-5 rounded-[1.5rem] border border-primary/20">
            <div className="flex items-start gap-3">
                <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={(checked: boolean) =>
                        setAgreed(checked === true)
                    }
                    className="mt-0.5 rounded-md border-border bg-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary/30"
                />
                <div>
                    <Label
                        htmlFor="terms"
                        className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                    >
                        I consent to the collection of my information for the purpose of this registration and confirm that the information provided is accurate.
                    </Label>
                </div>
            </div>
        </div>
    )
}
