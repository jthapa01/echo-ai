"use client";
import { useAction } from "convex/react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@workspace/ui/components/dropzone";
import { api } from "@workspace/backend/_generated/api";

interface UploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload?: () => void;
};

export const UploadDialog = ({ open, onOpenChange, onUpload, }: UploadDialogProps) => {
    const addFile = useAction(api.private.files.addFile);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        category: "",
        fileName: "",
    });

    const handleFileDrop = (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];

        if (file) {
            setUploadedFiles([file]);
            if (!uploadForm.fileName) {
                // updater function to set fileName only if it's empty
                setUploadForm((prev) => ({ ...prev, fileName: file.name }));
            }
        }
    };

    const handleUpload = async () => {
        setIsUploading(true);
        try {
            const blob = uploadedFiles[0];
            if (!blob) return;

            const filename = uploadForm.fileName || blob.name;
            await addFile({
                bytes: await blob.arrayBuffer(),
                filename,
                mimeType: blob.type || "text/plain",
                category: uploadForm.category,
            });

            onUpload?.();
            handleCancel();
        } catch (error) {
            console.error("Error uploading file:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
        setUploadedFiles([]);
        setUploadForm({ category: "", fileName: "" });
    };

    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                        Upload documents to your knowledge base for AI-powered search and retrieval.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input className="w-full"
                            id="category"
                            onChange={(e) => setUploadForm((prev) => ({ ...prev, category: e.target.value }))}
                            placeholder="e.g., Documentation, Support, Product"
                            type="text"
                            value={uploadForm.category}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fileName">
                            Filename{" "}
                            <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input className="w-full"
                            id="fileName"
                            onChange={(e) => setUploadForm((prev) => ({ ...prev, fileName: e.target.value }))}
                            placeholder="Override default filename"
                            type="text"
                            value={uploadForm.fileName}
                        />
                    </div>
                    <Dropzone accept={{
                        "application/pdf": [".pdf"],
                        "text/plain": [".txt"],
                        "text/csv": [".csv"],
                        "text/html": [".html", ".htm"],
                        "application/vnd.ms-excel": [".xls", ".xlsx", ".csv"],
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx", ".xls"],
                        "application/msword": [".doc", ".docx"],
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                    }}
                        disabled={isUploading}
                        maxFiles={1}
                        onDrop={handleFileDrop}
                        src={uploadedFiles}
                    >
                        <DropzoneEmptyState />
                        <DropzoneContent />
                    </Dropzone>
                </div>
                <DialogFooter>
                    <Button
                        disabled={isUploading}
                        variant="outline"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={isUploading || uploadedFiles.length === 0 || !uploadForm.category}
                        onClick={handleUpload}
                    >
                        {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};