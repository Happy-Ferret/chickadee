/** 
 * This version of Chickadee introduces support for conditional expressions, boolean values, 
 * and boolean operators.
 */ 
export module Chickadee
{
    export type Value = any;

    export type Node = 
        | Nodes.Code
        | Nodes.Const 
        | Nodes.Operator 
        | Nodes.Assign 
        | Nodes.VarDecl
        | Nodes.VarRef     
        | Nodes.Conditional; 
  
    export module Nodes 
    {
        export interface Code {
            type: 'code';
            statements: Node[];
        }

        export interface Const {
            type: 'const';
            value: Value;
        }

        export interface Operator {
            type: 'operator';
            func: Function;
            args: Node[];
        }

        export interface Assign {
            type: 'assign';
            name: string;
            value: Node;
        }

        export interface VarRef {
            type: 'var';
            name: string;
        }

        export interface VarDecl {
            type: 'decl';
            name: string;
            value: Node;
        }

        export interface Conditional {
            type: 'cond',
            cond: Node,
            onTrue: Node,
            onFalse: Node,
        }
    }

    export class Env 
    {       
        scope = {};
        getValue(name: string): Value { return this.scope[name]; }
        setValue(name: string, value: Value): Value { return this.scope[name] = value; }   
        declValue(name: string, value: Value): Value { return this.scope[name] = value; }
    }

    export interface UntypedAstNode {
        name: string;
        allText: string;
        children: UntypedAstNode[];
    }

    function makeOperator(op: string, args: Node[]): Node {
        const opFuncs = { 
            '+': (x,y) => x + y,
            '-': (x,y) => x - y,
            '*': (x,y) => x * y,
            '/': (x,y) => x / y,
            '%': (x,y) => x % y,
            '>': (x,y) => x > y,
            '<': (x,y) => x < y,
            '>=': (x,y) => x >= y,
            '<=': (x,y) => x <= y,
            '==': (x,y) => x === y,
            '!=': (x,y) => x !== y,
            '||': (x, y) => x || y,
            '&&': (x, y) => x && y,
        }
        if (!(op in opFuncs))
            throw new Error("Unhandled operator: " + op);
        return { type: 'operator', func: opFuncs[op], args }  
    }

    export function toTypedAst(ast: UntypedAstNode): Node {
        switch (ast.name) {
            case 'code': 
                return {
                    type: 'code',
                    statements: ast.children.map(toTypedAst)
                }
            case 'number':
                return { 
                    type: 'const', 
                    value: parseFloat(ast.allText) 
                }
            case 'bool':
                return { 
                    type: 'const', 
                    value: ast.allText === 'true', 
                }
            case 'varName': 
                return { 
                    type: 'var', 
                    name: ast.allText 
                }
            case 'varDecl': 
                return { 
                    type: 'decl', 
                    name: ast.children[0].allText, 
                    value: toTypedAst(ast.children[1]),
                }
            case 'assignmentExpr':
                return { 
                    type: 'assign', 
                    name: ast.children[0].allText, 
                    value: toTypedAst(ast.children[1].children[1]) 
                }
            case 'relationalExpr':
            case 'equalityExpr':
            case 'logicalAndExpr':
            case 'logicalOrExpr':
            case 'multiplicativeExpr':
            case 'additiveExpr':
            {             
                const a = toTypedAst(ast.children[0]);
                const op = ast.children[1].children[0].allText;  
                const b = toTypedAst(ast.children[1].children[1]);
                return makeOperator(op, [a, b]);
            }
            case 'conditionalExpr':
                return {
                    type: 'cond',
                    cond: toTypedAst(ast.children[0]),
                    onTrue: toTypedAst(ast.children[1].children[0]),
                    onFalse: toTypedAst(ast.children[1].children[1])
                }
            case 'parenExpr':
            case 'varDecls':
            case 'varDeclStatement':
            case 'exprStatement':
                return toTypedAst(ast.children[0]);
        }
        
        throw new Error("Not a recognized AST type: " + ast.name);
    }

    export function evaluate(node: Node, env: Env = new Env()): Value 
    {
        switch (node.type) 
        {
            case 'const':
            {
                return node.value;
            }
            case 'assign':
            {
                const rValue = evaluate(node.value, env); 
                return env.setValue(node.name, rValue);
            }
            case 'var':
            {
                return env.getValue(node.name);
            }
            case 'operator':
            {
                return node.func.call(null, ...node.args.map(a => evaluate(a, env)));
            }
            case 'cond':
            {
                return evaluate(node.cond, env) 
                    ? evaluate(node.onTrue, env) 
                    : evaluate(node.onFalse, env); 
            }        
            case 'decl':
            {
                return env.declValue(node.name, evaluate(node.value, env));
            }
            case 'code':
            {
                return node.statements.reduce((acc, st) => evaluate(st, env), null);
            }            
        } 
    }
}