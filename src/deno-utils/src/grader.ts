import * as pl from "npm:nodejs-polars@0.17.0";
import * as path from "jsr:@std/path@1.0.8";
import { assert } from "jsr:@std/assert@1.0.9";

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
  private bonuses: string[] = [];
  constructor() {}

  init(
    source_filepath: string,
    _opts?: Partial<{
      cwd: string;
      id_col: string;
      name_col: string;
    }>
  ): Grader {
    const opts = {
      cwd: import.meta.filename!,
      id_col: `ID number`,
      name_col: `Surname`,
      ..._opts,
    };
    this.root = opts.cwd;
    this.df = pl.readCSV(this._(source_filepath), {
      quoteChar: `"`,
    });
    this.df = this.df.select(
      pl.col(opts.id_col).alias(`nrp`).cast(pl.String, true),
      pl.col(opts.name_col).alias(`name`)
    );
    return this;
  }

  appendBonus(
    as_col: string,
    csv_file: string,
    _opts?: Partial<{
      id_col: string;
      score_col: string;
      divider: number;
    }>
  ): Grader {
    const opts = {
      id_col: `nrp`,
      score_col: `bonus`,
      divider: 1,
      ..._opts,
    };
    this.bonuses.push(as_col);
    const grade_df = pl.readCSV(this._(csv_file), {
      quoteChar: `"`,
    });
    const lastLen = this.df.shape.height;
    this.df = this.df.join(
      grade_df.select(
        pl.col(opts.id_col).alias(`nrp`).cast(pl.String, true),
        pl
          .col(opts.score_col)
          .alias(as_col)
          .cast(pl.Float64, true)
          .divideBy(pl.lit(opts.divider))
          .round(2)
      ),
      // TODO: Handle full
      { on: `nrp`, how: "left" }
    );
    // this.df = this.df.select(
    //   pl.col(`*`).exclude(`nrp`).exclude(`nrp_right`),
    //   pl
    //     .when(pl.col(`nrp`).isNull())
    //     .then(pl.col(`nrp_right`))
    //     .otherwise(pl.col(`nrp`))
    //     .alias(`nrp`)
    // );
    const nextLen = this.df.shape.height;
    assert(lastLen === nextLen, `lastLen[${lastLen}] !== nextLen[${nextLen}]`);
    return this;
  }

  appendScore(
    weight: number,
    as_col: string,
    csv_file: string,
    _opts?: Partial<{
      id_col: string;
      score_col: string;
      divider: number;
      type: "grade" | "score" | "existence";
    }>
  ): Grader {
    const opts = {
      id_col: `ID number`,
      score_col: `Grade/10.00`,
      divider: 10,
      type: "number",
      ..._opts,
    };
    this.weights.push([as_col, weight]);
    let grade_df = pl.readCSV(this._(csv_file), {
      quoteChar: `"`,
    });
    if (opts.type === "grade") {
      grade_df = grade_df
        .select(
          pl.col("*"),
          Grader.GRADE_MAP.reduce(
            (prev, [minScore, gradeName], i): pl.Then =>
              prev
                .when(
                  pl
                    .col(opts.score_col)
                    .fillNull(pl.lit("E"))
                    .eq(pl.lit(gradeName))
                )
                .then(
                  pl.lit(
                    ((minScore +
                      ((): number => {
                        if (i === 0) {
                          return 1;
                        } else {
                          return Grader.GRADE_MAP[i - 1][0];
                        }
                      })()) /
                      2) *
                      opts.divider
                  )
                ),
            pl as unknown as pl.Then
          )
            .otherwise(pl.lit(null))
            .alias(`$${opts.score_col}`)
        )
        .drop(opts.score_col)
        .rename({ [`$${opts.score_col}`]: opts.score_col });
    } else if (opts.type === "existence") {
      grade_df = grade_df.withColumn(pl.lit(1).alias(opts.score_col));
      opts.divider = 1;
    }
    const lastLen = this.df.shape.height;
    this.df = this.df.join(
      grade_df.select(
        pl.col(opts.id_col).alias(`nrp`).cast(pl.String, true),
        pl
          .col(opts.score_col)
          .alias(as_col)
          .cast(pl.Float64, true)
          .divideBy(pl.lit(opts.divider))
          .round(2)
      ),
      // TODO: Handle full
      { on: `nrp`, how: "left" }
    );
    // this.df = this.df.select(
    //   pl.col(`*`).exclude(`nrp`).exclude(`nrp_right`),
    //   pl
    //     .when(pl.col(`nrp`).isNull())
    //     .then(pl.col(`nrp_right`))
    //     .otherwise(pl.col(`nrp`))
    //     .alias(`nrp`)
    // );
    const nextLen = this.df.shape.height;
    assert(lastLen === nextLen, `lastLen[${lastLen}] !== nextLen[${nextLen}]`);
    return this;
  }

  display(): Grader {
    console.log(this.df.toString());

    return this;
  }

  displayGrade(): Grader {
    console.log(this.gradeDist().toString());
    return this;
  }

  displayShift(): Grader {
    console.log(
      this.gradeDist()
        .join(this.gradeDist(`shift_`), {
          leftOn: `grade`,
          rightOn: `shift_grade`,
          how: `left`,
        })
        .toString()
    );
    return this;
  }

  grade(): Grader {
    return this.#grade(``, 0);
  }

  #grade(prefix: string, shift: number): Grader {
    const totalWeight = this.weights.reduce((prev, curr) => prev + curr[1], 0);
    this.df = this.df.withColumn(
      this.weights
        .map(([col, weight]) =>
          pl
            .col(col)
            .fillNull(pl.lit(0))
            .mul(weight / totalWeight)
        )
        .reduce((prev, curr) => prev.add(curr))
        .add(pl.lit(shift))
        .alias(`${prefix}total`)
        .round(2)
    );
    this.df = this.df.withColumn(
      this.bonuses
        .map((col) => pl.col(col).fillNull(pl.lit(0)))
        .reduce((prev, curr) => prev.add(curr))
        .add(pl.col(`${prefix}total`))
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
