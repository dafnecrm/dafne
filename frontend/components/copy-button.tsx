'use client'

import { Copy } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState } from "react";

export default function CopyButton({
    value,
    closeAfter = 1000,
    ...props
}: {
    value: string
    closeAfter?: number
} & React.ComponentProps<typeof Button>) {
    const [open, setOpen] = useState(false)

    function copyValue() {
        navigator.clipboard.writeText(value)
        setOpen(true)
        setTimeout(() => {
            setOpen(false)
        }, closeAfter);
    }
    return (
        <Popover open={open}>
            <PopoverTrigger render={<Button {...props} onClick={copyValue} />}>
                <Copy />
            </PopoverTrigger>
            <PopoverContent className="w-24">
                Copied!
            </PopoverContent>
        </Popover>
    )
}