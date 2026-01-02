"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { PublicFile } from "@workspace/backend/private/files";
import { FileIcon, MoreHorizontalIcon, PlusIcon, TrashIcon } from "lucide-react";
import { UploadDialog } from "../components/upload-dialog";
import { useState } from "react";
import { DeleteFileDialog } from "../components/delete-file-dialog";
import { Button } from "@workspace/ui/components/button";

export const FilesView = () => {
    const files = usePaginatedQuery(api.private.files.list, {}, { initialNumItems: 10, });
    const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore, isLoadingFirstPage } = useInfiniteScroll({
        status: files.status,
        loadMore: files.loadMore,
        loadSize: 10,
    });

    const [uploadFileDialogOpen, setUploadFileDialogOpen] = useState(false);
    const [deleteFileDialogOpen, setDeleteFileDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<PublicFile | null>(null);

    const handleDeleteClick = (file: PublicFile) => {
        setSelectedFile(file);
        setDeleteFileDialogOpen(true);
    };

    const handleFiledeleted = () => {
        setSelectedFile(null);
    };

    return (
        <>
            <DeleteFileDialog
                onOpenChange={setDeleteFileDialogOpen}
                open={deleteFileDialogOpen}
                file={selectedFile}
                onDelete={handleFiledeleted}
            />
            <UploadDialog
                onOpenChange={setUploadFileDialogOpen}
                open={uploadFileDialogOpen}
            />
            <div className="flex min-h-screen flex-col bg-muted p-8">
                <div className="mx-auto w-full max-w-screen-md">
                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-4xl">Knowledge Base</h1>
                        <p className="text-muted-foreground">Upload and manage documents for your AI assistant</p>
                    </div>
                </div>
                <div className="mt-8 rounded-lg border bg-background">
                    <div className="flex items-center justify-end border-b px-6 py-4">
                        <Button onClick={() => setUploadFileDialogOpen(true)}
                        >
                            <PlusIcon />
                            Add New
                        </Button>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="px-6 py-4 font-medium">File Name</TableHead>
                                <TableHead className="px-6 py-4 font-medium">Type</TableHead>
                                <TableHead className="px-6 py-4 font-medium">Size</TableHead>
                                <TableHead className="px-6 py-4 font-medium">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* IIFE: Immediately Invoked Function Expression for conditional rendering */}
                            {(() => {
                                if (isLoadingFirstPage) {
                                    return (
                                        <TableRow>
                                            <TableCell className="h-24 text-center" colSpan={4}>Loading files...</TableCell>
                                        </TableRow>
                                    );
                                }

                                if (files.results.length === 0) {
                                    return (
                                        <TableRow>
                                            <TableCell className="h-24 text-center" colSpan={4}>No files uploaded yet.</TableCell>
                                        </TableRow>
                                    );
                                }

                                return files.results.map((file) => (
                                    <TableRow className="hover:bg-muted/50" key={file.id}>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <FileIcon />
                                                {file.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <Badge className="uppercase" variant="outline">{file.type}</Badge>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-muted-foreground">{file.size}</TableCell>
                                        <TableCell className="px-6 py-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button 
                                                        className="size-8 p-0"
                                                        variant="ghost"
                                                        size="sm"
                                                    >
                                                        <MoreHorizontalIcon />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDeleteClick(file)}
                                                    >
                                                        <TrashIcon className="mr-2 size-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            })()}
                        </TableBody>
                    </Table>
                    {!isLoadingFirstPage && files.results.length > 0 && (
                        <div className="border-t">
                            <InfiniteScrollTrigger
                                ref={topElementRef}
                                isLoadingMore={isLoadingMore}
                                canLoadMore={canLoadMore}
                                onLoadMore={handleLoadMore}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};