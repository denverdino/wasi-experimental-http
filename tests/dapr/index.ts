// @ts-ignore
import { Console } from "as-wasi";
import { DaprClient, StateItem } from "./dapr";
import { JSON } from "assemblyscript-json";


Console.log("Testing Dapr API ....")

let dapr = new DaprClient()
dapr.saveState("statestore", "weapon", JSON.Value.String("Death Star"))

let o = JSON.Value.Object() 
o.set("name", "Tatooine")
o.set("test", 123)
let item = new StateItem("planets", o)
let items: StateItem[] = [item]
dapr.saveBulkState("statestore", items)

let testObj = dapr.getState("statestore", "planets")
let testStr = dapr.getState("statestore", "weapon")

if (testStr.toString() == "Death Star" && testObj.isObj && (<JSON.Integer>(<JSON.Obj>testObj).getInteger("test")).valueOf() == 123) {
    Console.log("Test successfully!")
} else {
    Console.log("Test failed!")
}


