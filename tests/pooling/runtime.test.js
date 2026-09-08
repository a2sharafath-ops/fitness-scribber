import test from 'node:test'
import assert from 'node:assert/strict'
import {resolvedRuntime} from '../../src/lib/pooling/runtime.js'
const on={r1:true,r2:true,r3:true}
test('browser flags cannot turn an ordinary client into a governed client',()=>assert.deepEqual(resolvedRuntime(on,{r1:false,r2:false,r3:false,governed:false}),{r1:false,r2:false,r3:false,governed:false,status:'ready'}))
test('expired enrollment stays governed without permitting new authority',()=>{const r=resolvedRuntime(on,{r1:false,r2:false,r3:false,governed:true,testOnly:true});assert.equal(r.governed,true);assert.equal(r.r1,false)})
test('missing runtime must not fall back to a Classic authorization',()=>{assert.throws(()=>resolvedRuntime(on,null));assert.throws(()=>resolvedRuntime(on,{}))})
test('browser module switches can narrow but never broaden server admission',()=>{const r=resolvedRuntime({r1:true,r2:false,r3:false},{r1:true,r2:true,r3:true,governed:true});assert.equal(r.r1,true);assert.equal(r.r2,false);assert.equal(r.r3,false)})
