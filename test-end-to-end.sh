#!/bin/bash

# Error Monitor SDK - End-to-End Test Script
# 测试所有使用场景

echo "========================================="
echo "Error Monitor SDK - 端到端测试"
echo "========================================="
echo ""

SERVER_URL="http://localhost:3001"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 ${TOTAL_TESTS}: ${name}... "

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${SERVER_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${SERVER_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "  响应: ${body:0:100}..."
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "  期望状态码: ${expected_status}, 实际: ${status_code}"
        echo "  响应: ${body}"
    fi
    echo ""
}

# 清空错误
clear_errors() {
    echo -e "${BLUE}清空之前的错误数据...${NC}"
    curl -s -X POST "${SERVER_URL}/errors/clear" > /dev/null
    echo ""
}

# 等待函数
wait_for_report() {
    sleep 0.5
}

echo "========================================="
echo "1. 基础API测试"
echo "========================================="
echo ""

test_api "健康检查" "GET" "/health" "" "200"

clear_errors

echo "========================================="
echo "2. 错误上报测试"
echo "========================================="
echo ""

# 测试1: 基础JS错误上报
test_api "上报JS错误" "POST" "/collect" \
    '{"appId":"test-app","type":"js","level":"error","message":"Test JS error","stack":"Error: Test\\n  at test.js:10"}' \
    "200"
wait_for_report

# 测试2: Promise错误上报
test_api "上报Promise错误" "POST" "/collect" \
    '{"appId":"test-app","type":"promise","level":"error","message":"Unhandled Promise rejection"}' \
    "200"
wait_for_report

# 测试3: 网络错误上报
test_api "上报网络错误" "POST" "/collect" \
    '{"appId":"test-app","type":"network","level":"error","message":"Network request failed","context":{"url":"http://example.com/api","status":500}}' \
    "200"
wait_for_report

# 测试4: 资源错误上报
test_api "上报资源错误" "POST" "/collect" \
    '{"appId":"test-app","type":"resource","level":"error","message":"Image load failed","context":{"url":"http://example.com/image.jpg"}}' \
    "200"
wait_for_report

# 测试5: 自定义错误上报
test_api "上报自定义错误" "POST" "/collect" \
    '{"appId":"test-app","type":"custom","level":"info","message":"Custom log message","context":{"userId":"user-123"}}' \
    "200"
wait_for_report

# 测试6: 带标签的错误上报
test_api "上报带标签的错误" "POST" "/collect" \
    '{"appId":"test-app","type":"custom","level":"error","message":"Payment failed","context":{"tags":{"module":"checkout","critical":"true"}}}' \
    "200"
wait_for_report

# 测试7: 不同级别的错误
test_api "上报fatal级别错误" "POST" "/collect" \
    '{"appId":"test-app","type":"custom","level":"fatal","message":"Critical system failure"}' \
    "200"
wait_for_report

test_api "上报warn级别错误" "POST" "/collect" \
    '{"appId":"test-app","type":"custom","level":"warn","message":"Deprecated API usage"}' \
    "200"
wait_for_report

# 测试8: 批量错误上报
test_api "批量上报错误" "POST" "/collect" \
    '[{"appId":"test-app","type":"js","level":"error","message":"Batch error 1"},{"appId":"test-app","type":"js","level":"error","message":"Batch error 2"}]' \
    "200"
wait_for_report

echo "========================================="
echo "3. 错误查询测试"
echo "========================================="
echo ""

test_api "获取所有错误" "GET" "/errors" "" "200"

test_api "获取统计信息" "GET" "/stats" "" "200"

echo "========================================="
echo "4. 高级功能测试"
echo "========================================="
echo ""

# 测试带面包屑的错误
test_api "上报带面包屑的错误" "POST" "/collect" \
    '{"appId":"test-app","type":"custom","level":"error","message":"Error with breadcrumbs","breadcrumbs":[{"timestamp":1700000000000,"type":"navigation","message":"User navigated to /test"}]}' \
    "200"
wait_for_report

# 测试带额外数据的错误
test_api "上报带额外数据的错误" "POST" "/collect" \
    '{"appId":"test-app","type":"custom","level":"error","message":"Search failed","extra":{"query":"test","results":0}}' \
    "200"
wait_for_report

# 测试带用户信息的错误
test_api "上报带用户信息的错误" "POST" "/collect" \
    '{"appId":"test-app","type":"custom","level":"error","message":"User action failed","context":{"userId":"user-456","username":"testuser","email":"test@example.com"}}' \
    "200"
wait_for_report

echo "========================================="
echo "5. 边界情况测试"
echo "========================================="
echo ""

# 测试空消息
test_api "上报空消息错误" "POST" "/collect" \
    '{"appId":"test-app","type":"custom","level":"info","message":""}' \
    "200"
wait_for_report

# 测试超长消息
long_message=$(python3 -c "print('A' * 10000)")
test_api "上报超长消息" "POST" "/collect" \
    "{\"appId\":\"test-app\",\"type\":\"custom\",\"level\":\"error\",\"message\":\"$long_message\"}" \
    "200"
wait_for_report

# 测试特殊字符
test_api "上报带特殊字符的错误" "POST" "/collect" \
    '{"appId":"test-app","type":"custom","level":"error","message":"Error with special chars: <script>\u0026\u0027\"\\n\t"}' \
    "200"
wait_for_report

echo "========================================="
echo "6. 清空测试"
echo "========================================="
echo ""

test_api "清空错误数据" "POST" "/errors/clear" "" "200"

# 验证清空
echo "验证清空结果..."
sleep 1
errors_response=$(curl -s "${SERVER_URL}/errors")
error_count=$(echo "$errors_response" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
if [ "$error_count" -eq 0 ]; then
    echo -e "${GREEN}✓ 错误数据已成功清空${NC}"
else
    echo -e "${RED}✗ 错误数据清空失败，剩余 ${error_count} 条${NC}"
fi
echo ""

echo "========================================="
echo "7. 最终统计"
echo "========================================="
echo ""

# 获取最终统计
stats=$(curl -s "${SERVER_URL}/stats")
echo "服务器统计信息:"
echo "$stats" | python3 -m json.tool 2>/dev/null || echo "$stats"
echo ""

echo "========================================="
echo "测试总结"
echo "========================================="
echo ""
echo -e "总测试数: ${BLUE}${TOTAL_TESTS}${NC}"
echo -e "通过: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "失败: ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi
