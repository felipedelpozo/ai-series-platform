import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "../index";

describe("shared UI primitives", () => {
  test("renders semantic status and destructive variants", () => {
    const markup = renderToStaticMarkup(
      <div>
        <Badge variant="success">approved</Badge>
        <Button variant="destructive">Delete</Button>
        <Alert variant="warning">
          <AlertDescription>Needs review</AlertDescription>
        </Alert>
      </div>,
    );

    expect(markup).toContain("bg-success/12");
    expect(markup).toContain("bg-destructive");
    expect(markup).toContain('role="alert"');
  });

  test("renders accessible native structure without wrapper regressions", () => {
    const markup = renderToStaticMarkup(
      <Card>
        <Input aria-label="Series name" />
        <Skeleton className="h-4" />
        <Table aria-label="Jobs">
          <TableBody>
            <TableRow>
              <TableCell>queued</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>,
    );

    expect(markup).toContain('aria-label="Series name"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('aria-label="Jobs"');
  });
});
