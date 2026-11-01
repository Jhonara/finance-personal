package com.jr.financecapture;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Restores physical receipt rows when OCR emits the label and amount as separate blocks. */
public final class OcrTextLayout {
  private OcrTextLayout() { }

  public static final class Line {
    public final String text;
    public final int left;
    public final int top;
    public final int right;
    public final int bottom;
    public final double angle;

    public Line(String text, int left, int top, int right, int bottom, double angle) {
      this.text = text == null ? "" : text.replaceAll("\\s+", " ").trim();
      this.left = left; this.top = top; this.right = right; this.bottom = bottom;
      this.angle = angle;
    }

    private double centerX() { return (left + right) / 2.0; }
    private double centerY() { return (top + bottom) / 2.0; }
    private double textHeight() {
      double rotation = Math.abs(angle) <= 25 ? Math.abs(Math.tan(Math.toRadians(angle))) : 0;
      return Math.max(1, bottom - top - rotation * (right - left));
    }
  }

  public static String reconstruct(List<Line> input) {
    List<Line> lines = new ArrayList<>();
    for (Line line : input) {
      if (line != null && !line.text.isEmpty() && line.right > line.left && line.bottom > line.top) lines.add(line);
    }
    if (lines.isEmpty()) return "";
    List<Double> angles = new ArrayList<>();
    for (Line line : lines) if (Math.abs(line.angle) <= 25) angles.add(line.angle);
    angles.sort(Double::compare);
    double slope = angles.isEmpty() ? 0 : Math.tan(Math.toRadians(angles.get(angles.size() / 2)));
    lines.sort(Comparator.comparingDouble((Line line) -> y(line, slope)).thenComparingInt(line -> line.left));

    List<Row> rows = new ArrayList<>();
    for (Line line : lines) {
      Row nearest = null;
      double distance = Double.MAX_VALUE;
      for (int index = rows.size() - 1; index >= 0; index--) {
        Row row = rows.get(index);
        double gap = Math.abs(y(line, slope) - row.y);
        if (gap <= Math.min(line.textHeight(), row.height) * 0.45 && gap < distance && !row.overlaps(line)) {
          nearest = row; distance = gap;
        }
      }
      if (nearest == null) rows.add(new Row(line, slope));
      else nearest.add(line, slope);
    }
    rows.sort(Comparator.comparingDouble(row -> row.y));
    StringBuilder output = new StringBuilder();
    for (Row row : rows) {
      row.lines.sort(Comparator.comparingInt(line -> line.left));
      if (output.length() > 0) output.append('\n');
      for (int index = 0; index < row.lines.size(); index++) {
        if (index > 0) output.append(' ');
        output.append(row.lines.get(index).text);
      }
    }
    return output.toString();
  }

  private static double y(Line line, double slope) { return line.centerY() - line.centerX() * slope; }

  private static final class Row {
    private final List<Line> lines = new ArrayList<>();
    private double y;
    private double height;

    private Row(Line line, double slope) { add(line, slope); }

    private void add(Line line, double slope) {
      y = (y * lines.size() + OcrTextLayout.y(line, slope)) / (lines.size() + 1);
      height = lines.isEmpty() ? line.textHeight() : Math.min(height, line.textHeight());
      lines.add(line);
    }

    private boolean overlaps(Line line) {
      for (Line existing : lines) {
        int overlap = Math.min(existing.right, line.right) - Math.max(existing.left, line.left);
        if (overlap > Math.min(existing.right - existing.left, line.right - line.left) * 0.15) return true;
      }
      return false;
    }
  }
}
