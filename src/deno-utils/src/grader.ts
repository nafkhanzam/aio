import * as pl from "npm:nodejs-polars@0.17.0";
import * as path from "jsr:@std/path@1.0.8";

export class Grader {
  static GRADE_MAP: [number, string][] = [
    [0.86, "A"],
    [0.76, "AB"],
    [0.66, "B"],
    [0.61, "BC"],
    [0.56, "C"],
    [0.41, "D"],
    [0.0, "E"],
  ];
  private root!: string;
  private df!: pl.DataFrame;
  private weights: [string, number][] = [];
  constructor() {}

  init(source_filepath: string, cwd: string = import.meta.filename!): Grader {
    this.root = cwd;
    this.df = pl.readCSV(this._(source_filepath), {
      quoteChar: `"`,
    });
    this.df = this.df.select(
      pl.col(`ID number`).alias(`nrp`).cast(pl.String, true),
      pl.col(`Surname`).alias(`name`)
    );
    return this;
  }

  appendScore(weight: number, as_col: string, csv_file: string): Grader {
    this.weights.push([as_col, weight]);
    const grade_df = pl.readCSV(this._(csv_file), {
      quoteChar: `"`,
    });
    this.df = this.df.join(
      grade_df.select(
        pl.col(`ID number`).alias(`nrp`).cast(pl.String, true),
        pl
          .col(`Grade/10.00`)
          .alias(as_col)
          .cast(pl.Float64, true)
          .divideBy(pl.lit(10))
          .round(2)
      ),
      { on: `nrp`, how: "left" }
    );

    return this;
  }

  display(): Grader {
    console.log(this.df.toString());

    return this;
  }

  grade(): Grader {
    return this.#grade(``, 0);
  }

  #grade(prefix: string, shift: number): Grader {
    const totalWeight = this.weights.reduce((prev, curr) => prev + curr[1], 0);
    this.df = this.df.withColumn(
      this.weights
        .map(([col, weight]) => pl.col(col).mul(weight / totalWeight))
        .reduce((prev, curr) => prev.add(curr))
        .add(pl.lit(shift))
        .alias(`${prefix}total`)
        .round(2)
    );
    this.df = this.df.withColumn(
      Grader.GRADE_MAP.reduce(
        (prev, [minScore, gradeName]): pl.Then =>
          prev
            .when(pl.col(`${prefix}total`).fillNull(pl.lit(0)).gtEq(minScore))
            .then(pl.lit(gradeName)),
        pl as unknown as pl.Then
      )
        .otherwise(pl.lit(null))
        .alias(`${prefix}grade`)
    );
    return this;
  }

  shift(shift: number): Grader {
    return this.#grade(`shift_`, shift);
  }

  writeCsv(filename: string): Grader {
    Deno.writeFileSync(this._(filename), this.df.writeCSV());
    return this;
  }

  gradeDist(prefix: string = ``): pl.DataFrame {
    const grades: pl.Series = this.df.getColumn(`${prefix}grade`);
    return grades.valueCounts().sort(pl.col(`${prefix}grade`));
  }

  private _(filepath: string): string {
    return path.join(this.root, filepath);
  }
}
