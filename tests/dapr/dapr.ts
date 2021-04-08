// @ts-ignore
import { Console } from "as-wasi";
import { Method, RequestBuilder, Response } from "../../crates/as";

import { JSONEncoder, JSON } from "assemblyscript-json";

export class StateItem {
  key: string
  value: JSON.Value
  etag: string | null
  metadata: Map<string, string> | null

  constructor(key: string, value: JSON.Value) {
    this.key = key
    this.value = value
    this.etag = null
    this.metadata = null
  }
}

function encodeValue(encoder: JSONEncoder, name: string | null, value: JSON.Value): void {
  if (value.isArr) {
    let arr = (<JSON.Arr>value)._arr
    encoder.pushArray(name)
    for (let i = 0, len = arr.length; i < len; i++) {
      let v = arr[i]
      encodeValue(encoder, "", v)
    }
    encoder.popArray()
  } else if (value.isObj) {
    let obj = <JSON.Obj>value
    let keys = obj.keys
    encoder.pushObject(name)
    for (let i = 0, len = keys.length; i < len; i++) {
      let key = keys[i]
      encodeValue(encoder, key, <JSON.Value>obj.get(key))
    }
    encoder.popObject()
  } else if (value.isBool) {
    encoder.setBoolean(name, (<JSON.Bool>value).valueOf())
  } else if (value.isFloat) {
    encoder.setFloat(name, (<JSON.Float>value).valueOf())
  } else if (value.isInteger) {
    encoder.setInteger(name, (<JSON.Integer>value).valueOf())
  } else if (value.isNull) {
    encoder.setNull(name)
  } else if (value.isString) {
    encoder.setString(name, (<JSON.Str>value).valueOf())
  }
};

export class DaprClient {
  port: i32
  address: string

  constructor() {
    this.address = "127.0.0.1"
    this.port = 3500
  }

  stateURL(storeName: string): string {
    return "http://" + this.address + ":" + this.port.toString() + "/v1.0/state/" + storeName
  }

  saveState(storeName: string, key: string, value: JSON.Value): boolean {
    let item = new StateItem(key, value)
    let items: StateItem[] = [item]
    return this.saveBulkState(storeName, items)
  }

  saveBulkState(storeName: string, items: StateItem[]): boolean {
    // Handle field
    let encoder = new JSONEncoder();

    // Construct necessary object
    encoder.pushArray(null);
    for (let i = 0, len = items.length; i < len; i++) {
      let item = items[i]
      encoder.pushObject(null);
      encoder.setString("key", item.key)
      encodeValue(encoder, "value", item.value)
      if (item.etag != null) {
        encoder.setString("etag", <string>item.etag)
      }
      encoder.popObject()
    };
    encoder.popArray();
    // Or get serialized data as string
    let jsonString = encoder.toString();
    let url = this.stateURL(storeName);
    Console.log("POST " + url + " with " + jsonString);
    let res = new RequestBuilder(url)
      .method(Method.POST)
      .header("Content-Type", "application/json")
      .body(String.UTF8.encode(jsonString))
      .send();
    let ok = res.status.toString() == "200"
    res.close();
    return ok
  }

  getState(storeName: string, key: string): JSON.Value {
    let url = this.stateURL(storeName) + "/" + key;
    Console.log("GET " + url);
    let res = new RequestBuilder(url)
      .method(Method.GET)
      .send();
    let ok = res.status.toString() == "200"
    let result = <JSON.Value> new JSON.Null()
    if (ok) {
      let body = res.bodyReadAll();
      result = <JSON.Value>JSON.parse(body)
    }
    res.close();
    return result
  }
};
