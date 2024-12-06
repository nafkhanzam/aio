import {Command, Flags} from "@oclif/core";

export default class _Command extends Command {
  static override flags = {
    name: Flags.string({
      char: "n",
      required: true,
    }),
  };

  override async run(): Promise<void> {
    const {flags} = await this.parse(_Command);
    console.log(`Hello, ${flags.name}!`);
  }
}
