"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogDescription, DialogTitle, } from "@workspace/ui/components/dialog";
import { api } from "@workspace/backend/_generated/api";
import type { PublicFile } from "@workspace/backend/private/files";

interface DeleteFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: PublicFile | null;
    onDelete?: () => void;
};

export const DeleteFileDialog = ({ open, onOpenChange, file, onDelete, }: DeleteFileDialogProps) => {
    const deleteFileMutation = useMutation(api.private.files.deleteFile);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!file) return;
        setIsDeleting(true);

        try {
            // every file will have entryId in rag:entries table
            await deleteFileMutation({ entryId: file.id });
            onDelete?.(); // to let parent know the status of delete
            onOpenChange(false); // controls dialog open close
        } catch (error) {
            console.error("Error deleting file:", error);
        } finally {
            setIsDeleting(false);
        }
    }
    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete File</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete the file &quot;{file?.name}&quot;? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                {file && (
                    <div className="py-4">
                        <div className="rounded-lg border bg-muted/50 p-4">
                            <p className="font-medium">{file.name}</p>
                            <p className="text-muted-foreground text-sm">Type: {file.type.toUpperCase()} | Size: {file.size}</p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button disabled={isDeleting} 
                        variant="outline" 
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={isDeleting || !file}
                        onClick={handleDelete}
                        variant="destructive"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};